// `in` is a Kotlin keyword, so the package name needs backticks here.
package `in`.gov.jharkhand.arsafetytrainer.ar

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.ar.core.Config
import com.google.ar.core.Plane
import com.google.ar.core.TrackingState
import io.github.sceneview.ar.ARSceneView
import io.github.sceneview.ar.node.AnchorNode
import io.github.sceneview.math.Position
import io.github.sceneview.node.ModelNode

/**
 * Full-screen, fully OFFLINE augmented reality: places one training model
 * (a .glb bundled inside the APK) on the real floor or table in front of
 * the worker. Opened from the web app through [ArViewerPlugin].
 *
 * How it works for the user:
 *  1. Move the phone slowly until ARCore finds a flat surface.
 *  2. Tap the surface: the model appears there at its real-world size.
 *  3. Pinch to resize, twist with two fingers to rotate, tap elsewhere to move it.
 *
 * All on-screen text is passed in by the web app, so it stays in whichever
 * language (English/Hindi) the app is using.
 */
class ArViewerActivity : AppCompatActivity() {

    /** What the web app passes in. [intent] builds the matching Intent. */
    data class Request(
        val modelAsset: String,   // path inside the APK, e.g. "public/models/ppe-helmet.glb"
        val title: String,
        val sizeMetres: Float,    // largest dimension of the model in the real world
        val hintScan: String,
        val hintTap: String,
        val hintPlaced: String,
        val errorText: String,
        val closeLabel: String,
    ) {
        fun intent(context: Context): Intent = Intent(context, ArViewerActivity::class.java)
            .putExtra(EXTRA_MODEL, modelAsset)
            .putExtra(EXTRA_TITLE, title)
            .putExtra(EXTRA_SIZE, sizeMetres)
            .putExtra(EXTRA_HINT_SCAN, hintScan)
            .putExtra(EXTRA_HINT_TAP, hintTap)
            .putExtra(EXTRA_HINT_PLACED, hintPlaced)
            .putExtra(EXTRA_ERROR, errorText)
            .putExtra(EXTRA_CLOSE, closeLabel)
    }

    private lateinit var request: Request
    private lateinit var sceneView: ARSceneView
    private lateinit var hintView: TextView

    private var modelNode: ModelNode? = null
    private var placedAnchor: AnchorNode? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        request = readRequest(intent)

        sceneView = ARSceneView(
            context = this,
            sessionConfiguration = { session, config ->
                config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL
                config.lightEstimationMode = Config.LightEstimationMode.ENVIRONMENTAL_HDR
                // Depth lets real objects hide the model where supported.
                if (session.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
                    config.depthMode = Config.DepthMode.AUTOMATIC
                }
            },
            onSessionUpdated = { session, _ ->
                val surfaceFound = session.getAllTrackables(Plane::class.java).any {
                    it.trackingState == TrackingState.TRACKING &&
                        it.type == Plane.Type.HORIZONTAL_UPWARD_FACING
                }
                showHint(
                    when {
                        placedAnchor != null -> request.hintPlaced
                        surfaceFound -> request.hintTap
                        else -> request.hintScan
                    }
                )
            },
            // ARCore missing/unsupported, camera denied, etc.
            onSessionFailed = { failAndClose() },
        ).apply {
            planeRenderer.isEnabled = true
            // Taps on empty space place (or move) the model; taps on the
            // model itself are left to its own rotate/scale gestures.
            setOnGestureListener(onSingleTapConfirmed = { e, node ->
                if (node == null) placeModelAt(e.x, e.y)
            })
        }

        setContentView(buildLayout())
    }

    private fun readRequest(intent: Intent) = Request(
        modelAsset = intent.getStringExtra(EXTRA_MODEL).orEmpty(),
        title = intent.getStringExtra(EXTRA_TITLE).orEmpty(),
        sizeMetres = intent.getFloatExtra(EXTRA_SIZE, 1f),
        hintScan = intent.getStringExtra(EXTRA_HINT_SCAN).orEmpty(),
        hintTap = intent.getStringExtra(EXTRA_HINT_TAP).orEmpty(),
        hintPlaced = intent.getStringExtra(EXTRA_HINT_PLACED).orEmpty(),
        errorText = intent.getStringExtra(EXTRA_ERROR).orEmpty(),
        closeLabel = intent.getStringExtra(EXTRA_CLOSE).orEmpty(),
    )

    private fun placeModelAt(x: Float, y: Float) {
        val hit = sceneView.hitTestAR(
            xPx = x,
            yPx = y,
            planeTypes = setOf(Plane.Type.HORIZONTAL_UPWARD_FACING),
        ) ?: return
        val model = modelNode ?: loadModel() ?: return
        val anchorNode = AnchorNode(sceneView.engine, hit.createAnchor())

        // Moving the model: re-parent it onto the new anchor and release the old one.
        placedAnchor?.let { old ->
            sceneView.removeChildNode(old)
            old.anchor.detach()
        }
        anchorNode.addChildNode(model)
        sceneView.addChildNode(anchorNode)
        placedAnchor = anchorNode
    }

    // The models are exported normalised to a 1 m box, so scaling to
    // sizeMetres gives the real-world size (e.g. 0.28 m for the helmet).
    private fun loadModel(): ModelNode? = runCatching {
        val instance = sceneView.modelLoader.createModelInstance(assetFileLocation = request.modelAsset)
        ModelNode(
            modelInstance = instance,
            scaleToUnits = request.sizeMetres,
            centerOrigin = Position(x = 0f, y = -1f, z = 0f), // bottom of the model sits on the surface
        ).apply {
            isEditable = true           // pinch to scale, twist to rotate
            isPositionEditable = false  // moving is done by tapping a new spot
            val base = scale.x
            editableScaleRange = (base * 0.25f)..(base * 4f)
        }
    }.onSuccess { modelNode = it }
        .onFailure { failAndClose() }
        .getOrNull()

    private fun showHint(text: String) {
        if (hintView.text != text) hintView.text = text
    }

    private fun failAndClose() {
        runOnUiThread {
            Toast.makeText(this, request.errorText, Toast.LENGTH_LONG).show()
            finish()
        }
    }

    // --- Layout: camera view + a title/hint card on top + a close button ---

    private fun buildLayout(): FrameLayout {
        val root = FrameLayout(this)
        root.addView(sceneView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))

        val card = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(12), dp(16), dp(12))
            background = GradientDrawable().apply {
                cornerRadius = dp(14).toFloat()
                setColor(Color.argb(200, 11, 15, 23)) // app background, translucent
            }
        }
        card.addView(TextView(this).apply {
            text = request.title
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 17f)
            setTypeface(typeface, android.graphics.Typeface.BOLD)
        })
        hintView = TextView(this).apply {
            text = request.hintScan
            setTextColor(Color.rgb(0xEE, 0xF2, 0xF7))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 14f)
            setPadding(0, dp(4), 0, 0)
        }
        card.addView(hintView)
        root.addView(card, FrameLayout.LayoutParams(MATCH_PARENT, WRAP_CONTENT, Gravity.TOP).apply {
            setMargins(dp(12), dp(40), dp(72), 0)
        })

        val close = TextView(this).apply {
            text = "✕"
            contentDescription = request.closeLabel
            gravity = Gravity.CENTER
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.argb(200, 11, 15, 23))
            }
            setOnClickListener { finish() }
        }
        root.addView(close, FrameLayout.LayoutParams(dp(48), dp(48), Gravity.TOP or Gravity.END).apply {
            setMargins(0, dp(40), dp(12), 0)
        })
        return root
    }

    private fun dp(value: Int) =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

    private companion object {
        const val EXTRA_MODEL = "modelAsset"
        const val EXTRA_TITLE = "title"
        const val EXTRA_SIZE = "sizeMetres"
        const val EXTRA_HINT_SCAN = "hintScan"
        const val EXTRA_HINT_TAP = "hintTap"
        const val EXTRA_HINT_PLACED = "hintPlaced"
        const val EXTRA_ERROR = "errorText"
        const val EXTRA_CLOSE = "closeLabel"
    }
}
