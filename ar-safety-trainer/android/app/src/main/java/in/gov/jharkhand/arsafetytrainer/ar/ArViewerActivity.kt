// `in` is a Kotlin keyword, so the package name needs backticks here.
package `in`.gov.jharkhand.arsafetytrainer.ar

import android.animation.ValueAnimator
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup.LayoutParams.MATCH_PARENT
import android.view.ViewGroup.LayoutParams.WRAP_CONTENT
import android.view.animation.DecelerateInterpolator
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.ar.core.Config
import com.google.ar.core.HitResult
import com.google.ar.core.Plane
import com.google.ar.core.TrackingState
import dev.romainguy.kotlin.math.Float3
import io.github.sceneview.ar.ARSceneView
import io.github.sceneview.ar.node.AnchorNode
import io.github.sceneview.math.Position
import io.github.sceneview.node.CylinderNode
import io.github.sceneview.node.ModelNode
import io.github.sceneview.node.Node

/**
 * Full-screen, fully OFFLINE augmented reality in the style of Google's
 * Scene Viewer: places one training model (a .glb bundled inside the APK)
 * on the real floor in front of the worker. Opened from the web app through
 * [ArViewerPlugin] when the phone has no internet (with internet, the app
 * opens Google Scene Viewer itself — see src/platform/arLauncher.js).
 *
 * What the worker sees:
 *  1. "Move your phone slowly": ARCore looks for the floor (faint dots).
 *  2. An aiming disc appears on the floor at the centre of the screen and
 *     the model pops in there by itself, at real-world size, with a shadow.
 *  3. One finger drags it along the floor; pinch resizes; twist rotates.
 *     The dots disappear once the model is placed. "Reset" puts it back.
 *
 * All on-screen text comes from the web app, so it is in the app's language.
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
        val resetLabel: String = "Reset",
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
            .putExtra(EXTRA_RESET, resetLabel)
    }

    private lateinit var request: Request
    private lateinit var sceneView: ARSceneView
    private lateinit var hintView: TextView
    private lateinit var resetButton: TextView

    private var modelNode: ModelNode? = null
    private var anchorNode: AnchorNode? = null
    private var reticle: Node? = null
    private var baseScale = 1f
    private var modelFailed = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        request = readRequest(intent)

        sceneView = ARSceneView(
            context = this,
            sessionConfiguration = { _, config ->
                config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL
                config.lightEstimationMode = Config.LightEstimationMode.ENVIRONMENTAL_HDR
                config.focusMode = Config.FocusMode.AUTO
                // No depth occlusion: it cut parts of the model away and made it flicker.
                config.depthMode = Config.DepthMode.DISABLED
            },
            onSessionUpdated = { session, _ -> onFrame(session.getAllTrackables(Plane::class.java)) },
            // ARCore missing/unsupported, camera denied, etc.
            onSessionFailed = { failAndClose() },
        ).apply {
            // Faint dots while searching; they also catch the model's shadow.
            planeRenderer.isEnabled = true
            planeRenderer.isShadowReceiver = true
            setOnGestureListener(
                // A tap on the floor moves the model there.
                onSingleTapConfirmed = { e, node -> if (node == null) moveModelTo(hitAt(e.x, e.y)) },
                // One finger drags it along the floor (two fingers = rotate / resize).
                onScroll = { _, e2, _, _ -> if (e2.pointerCount == 1) moveModelTo(hitAt(e2.x, e2.y)) },
            )
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
        resetLabel = intent.getStringExtra(EXTRA_RESET) ?: "Reset",
    )

    // ---- every camera frame ---------------------------------------------------

    private fun onFrame(planes: Collection<Plane>) {
        val floorFound = planes.any {
            it.trackingState == TrackingState.TRACKING && it.type == Plane.Type.HORIZONTAL_UPWARD_FACING
        }
        val centreHit = if (floorFound) hitAt(sceneView.width / 2f, sceneView.height / 2f) else null

        // Aiming disc on the floor at the screen centre, until the model is placed.
        val disc = reticle ?: createReticle()
        if (anchorNode == null && centreHit != null) {
            disc.isVisible = true
            disc.worldPosition = poseToFloat3(centreHit)
        } else {
            disc.isVisible = false
        }

        // Scene Viewer style: the model appears by itself as soon as there's a floor.
        if (anchorNode == null && centreHit != null && !modelFailed) placeModel(centreHit)

        showHint(
            when {
                anchorNode != null -> request.hintPlaced
                floorFound -> request.hintTap
                else -> request.hintScan
            }
        )
    }

    private fun hitAt(x: Float, y: Float): HitResult? = sceneView.hitTestAR(
        xPx = x,
        yPx = y,
        planeTypes = setOf(Plane.Type.HORIZONTAL_UPWARD_FACING),
    )

    private fun poseToFloat3(hit: HitResult) =
        hit.hitPose.let { Float3(it.tx(), it.ty(), it.tz()) }

    // ---- placing / moving the model --------------------------------------------

    private fun placeModel(hit: HitResult) {
        val model = modelNode ?: loadModel() ?: return
        val anchor = AnchorNode(sceneView.engine, hit.createAnchor())
        anchor.addChildNode(model)
        sceneView.addChildNode(anchor)
        anchorNode = anchor
        // Hide the dots once placed; the floor still shows the model's shadow.
        sceneView.planeRenderer.isVisible = false
        resetButton.visibility = View.VISIBLE
        popIn(model)
    }

    private fun moveModelTo(hit: HitResult?) {
        if (hit == null) return
        if (anchorNode == null) {
            placeModel(hit)
            return
        }
        modelNode?.worldPosition = poseToFloat3(hit)
    }

    private fun resetModel() {
        val model = modelNode ?: return
        model.rotation = Float3(0f, 0f, 0f)
        model.scale = Float3(baseScale)
        hitAt(sceneView.width / 2f, sceneView.height / 2f)?.let { model.worldPosition = poseToFloat3(it) }
        popIn(model)
    }

    // Small "pop" when the model appears, like Scene Viewer.
    private fun popIn(model: ModelNode) {
        ValueAnimator.ofFloat(0.6f, 1f).apply {
            duration = 280
            interpolator = DecelerateInterpolator()
            addUpdateListener { model.scale = Float3(baseScale * (it.animatedValue as Float)) }
            start()
        }
    }

    // The models are exported normalised to a 1 m box, so scaling to
    // sizeMetres gives the real-world size (e.g. 0.28 m for the helmet).
    private fun loadModel(): ModelNode? = runCatching {
        val instance = sceneView.modelLoader.createModelInstance(assetFileLocation = request.modelAsset)
        ModelNode(
            modelInstance = instance,
            scaleToUnits = request.sizeMetres,
            centerOrigin = Position(x = 0f, y = -1f, z = 0f), // bottom of the model sits on the floor
        ).apply {
            isShadowCaster = true
            isEditable = true           // pinch to resize, twist to rotate
            isPositionEditable = false  // moving is our own one-finger drag
            baseScale = scale.x
            editableScaleRange = (baseScale * 0.25f)..(baseScale * 4f)
        }
    }.onSuccess { modelNode = it }
        .onFailure {
            modelFailed = true
            failAndClose()
        }
        .getOrNull()

    // White disc with a navy centre dot: where the model will land.
    private fun createReticle(): Node {
        val white = sceneView.materialLoader.createColorInstance(Color.WHITE, 0f, 1f, 0f)
        val navy = sceneView.materialLoader.createColorInstance(NAVY, 0f, 1f, 0f)
        val disc = CylinderNode(sceneView.engine, 0.09f, 0.002f, Float3(0f), 48, listOf(white))
        val dot = CylinderNode(sceneView.engine, 0.018f, 0.003f, Float3(0f, 0.001f, 0f), 24, listOf(navy))
        disc.addChildNode(dot)
        disc.isVisible = false
        sceneView.addChildNode(disc)
        reticle = disc
        return disc
    }

    private fun showHint(text: String) {
        if (hintView.text != text) hintView.text = text
    }

    private fun failAndClose() {
        runOnUiThread {
            Toast.makeText(this, request.errorText, Toast.LENGTH_LONG).show()
            finish()
        }
    }

    // --- Layout: camera + title pill, close, hint pill, reset (app's light style) ---

    private fun buildLayout(): FrameLayout {
        val root = FrameLayout(this)
        root.addView(sceneView, FrameLayout.LayoutParams(MATCH_PARENT, MATCH_PARENT))

        val title = pill(request.title, bold = true, sizeSp = 16f)
        root.addView(title, FrameLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT, Gravity.TOP or Gravity.CENTER_HORIZONTAL).apply {
            setMargins(dp(72), dp(40), dp(72), 0)
        })

        val close = roundButton("✕", request.closeLabel) { finish() }
        root.addView(close, FrameLayout.LayoutParams(dp(48), dp(48), Gravity.TOP or Gravity.START).apply {
            setMargins(dp(12), dp(36), 0, 0)
        })

        hintView = pill(request.hintScan, bold = false, sizeSp = 15f)
        root.addView(hintView, FrameLayout.LayoutParams(WRAP_CONTENT, WRAP_CONTENT, Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL).apply {
            setMargins(dp(20), 0, dp(20), dp(40))
        })

        resetButton = roundButton("↺", request.resetLabel) { resetModel() }.apply { visibility = View.GONE }
        root.addView(resetButton, FrameLayout.LayoutParams(dp(52), dp(52), Gravity.BOTTOM or Gravity.END).apply {
            setMargins(0, 0, dp(16), dp(104))
        })
        return root
    }

    private fun pill(text: String, bold: Boolean, sizeSp: Float) = TextView(this).apply {
        this.text = text
        gravity = Gravity.CENTER
        setTextColor(NAVY)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
        if (bold) setTypeface(typeface, Typeface.BOLD)
        setPadding(dp(18), dp(10), dp(18), dp(10))
        elevation = dp(4).toFloat()
        background = GradientDrawable().apply {
            cornerRadius = dp(24).toFloat()
            setColor(Color.argb(240, 255, 255, 255))
        }
    }

    private fun roundButton(symbol: String, label: String, onClick: () -> Unit) = TextView(this).apply {
        text = symbol
        contentDescription = label
        gravity = Gravity.CENTER
        setTextColor(NAVY)
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
        setTypeface(typeface, Typeface.BOLD)
        elevation = dp(4).toFloat()
        background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.WHITE)
        }
        setOnClickListener { onClick() }
    }

    private fun dp(value: Int) =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

    private companion object {
        val NAVY = Color.rgb(0x0B, 0x3D, 0x91)
        const val EXTRA_MODEL = "modelAsset"
        const val EXTRA_TITLE = "title"
        const val EXTRA_SIZE = "sizeMetres"
        const val EXTRA_HINT_SCAN = "hintScan"
        const val EXTRA_HINT_TAP = "hintTap"
        const val EXTRA_HINT_PLACED = "hintPlaced"
        const val EXTRA_ERROR = "errorText"
        const val EXTRA_CLOSE = "closeLabel"
        const val EXTRA_RESET = "resetLabel"
    }
}
