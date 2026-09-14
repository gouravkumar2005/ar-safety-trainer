// Builds the real .pptx from content.js. Re-run (`npm run generate`)
// whenever content.js has been updated to match the current project —
// this file is pure formatting, content.js is the only thing that should
// need editing as the project evolves.

import pptxgen from 'pptxgenjs'
import { team, meta, problem, solution, tech, impact, references } from './content.js'

const COLORS = {
  bg: '0b0f17',
  surface: '131a26',
  accent: 'ffb020',
  accent2: '0b5fff',
  good: '2fbf71',
  bad: 'ef4444',
  text: 'eef2f7',
  textDim: '9aa7bb',
}
const FONT = 'Calibri'

const pres = new pptxgen()
pres.defineLayout({ name: 'SIH16x9', width: 13.33, height: 7.5 })
pres.layout = 'SIH16x9'
pres.author = team.teamName
pres.title = `${meta.psId} — ${meta.appName}`

function baseSlide() {
  const slide = pres.addSlide()
  slide.background = { color: COLORS.bg }
  return slide
}

function addChrome(slide, title, slideNum) {
  slide.addText(title, {
    x: 0.5, y: 0.32, w: 12.3, h: 0.75,
    fontSize: 30, bold: true, color: COLORS.accent, fontFace: FONT,
  })
  slide.addShape('line', {
    x: 0.5, y: 1.05, w: 12.3, h: 0,
    line: { color: COLORS.surface, width: 1.5 },
  })
  slide.addText(`${meta.psId} — ${meta.appName}`, {
    x: 0.5, y: 7.08, w: 8, h: 0.3,
    fontSize: 10, color: COLORS.textDim, fontFace: FONT,
  })
  slide.addText(`${slideNum} / 6`, {
    x: 12.0, y: 7.08, w: 0.83, h: 0.3,
    fontSize: 10, color: COLORS.textDim, align: 'right', fontFace: FONT,
  })
}

function bulletList(points, opts = {}) {
  return points.map((p) => ({
    text: p,
    options: { bullet: { code: '2022', indent: 18 }, breakLine: true, paraSpaceAfter: 10, ...opts },
  }))
}

// --- Slide 1: Title -------------------------------------------------------
{
  const slide = baseSlide()
  slide.addText(meta.appName, {
    x: 0.8, y: 1.5, w: 11.7, h: 1.1,
    fontSize: 46, bold: true, color: COLORS.text, fontFace: FONT,
  })
  slide.addText(meta.psTitle, {
    x: 0.8, y: 2.65, w: 11.7, h: 1.0,
    fontSize: 19, color: COLORS.accent, fontFace: FONT, italic: true,
  })
  slide.addText([
    { text: meta.psId, options: { bold: true, color: COLORS.accent2 } },
    { text: `   •   ${meta.category}   •   ${meta.theme}`, options: { color: COLORS.textDim } },
  ], {
    x: 0.8, y: 3.8, w: 11.7, h: 0.5,
    fontSize: 14, fontFace: FONT,
  })
  slide.addText(meta.organization, {
    x: 0.8, y: 4.25, w: 11.7, h: 0.4,
    fontSize: 14, color: COLORS.textDim, fontFace: FONT,
  })
  slide.addShape('line', { x: 0.8, y: 5.0, w: 5, h: 0, line: { color: COLORS.surface, width: 1.5 } })
  slide.addText([
    { text: `Team: ${team.teamName}`, options: { bold: true, color: COLORS.text, breakLine: true } },
    { text: team.members.join('   •   '), options: { color: COLORS.textDim, breakLine: true } },
    { text: `${team.institution}     |     ${team.contact}`, options: { color: COLORS.textDim } },
  ], {
    x: 0.8, y: 5.3, w: 11.7, h: 1.4,
    fontSize: 13, fontFace: FONT,
  })
}

// --- Slide 2: Problem -------------------------------------------------------
{
  const slide = baseSlide()
  addChrome(slide, problem.heading, 2)
  slide.addText(bulletList(problem.points), {
    x: 0.7, y: 1.35, w: 11.9, h: 5.4,
    fontSize: 17, color: COLORS.text, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.15,
  })
}

// --- Slide 3: Solution -------------------------------------------------------
{
  const slide = baseSlide()
  addChrome(slide, solution.heading, 3)
  slide.addText(solution.pitch, {
    x: 0.7, y: 1.3, w: 11.9, h: 0.9,
    fontSize: 18, bold: true, color: COLORS.accent, fontFace: FONT, italic: true,
  })
  slide.addText(bulletList(solution.features), {
    x: 0.7, y: 2.3, w: 11.9, h: 3.7,
    fontSize: 14.5, color: COLORS.text, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.1,
  })
  slide.addShape('roundRect', {
    x: 0.7, y: 6.15, w: 11.9, h: 0.75, rectRadius: 0.08,
    fill: { color: COLORS.surface }, line: { color: COLORS.good, width: 1 },
  })
  slide.addText([
    { text: 'Why it’s different:  ', options: { bold: true, color: COLORS.good } },
    { text: solution.differentiation, options: { color: COLORS.textDim } },
  ], {
    x: 0.95, y: 6.15, w: 11.4, h: 0.75, fontSize: 12.5, fontFace: FONT, valign: 'middle',
  })
}

// --- Slide 4: Tech feasibility -------------------------------------------------------
{
  const slide = baseSlide()
  addChrome(slide, tech.heading, 4)
  const tableRows = [
    [
      { text: 'Layer', options: { bold: true, color: COLORS.accent, fill: { color: COLORS.surface } } },
      { text: 'Implementation', options: { bold: true, color: COLORS.accent, fill: { color: COLORS.surface } } },
    ],
    ...tech.stack.map(([layer, impl]) => [
      { text: layer, options: { bold: true, color: COLORS.text, fill: { color: COLORS.bg } } },
      { text: impl, options: { color: COLORS.textDim, fill: { color: COLORS.bg } } },
    ]),
  ]
  slide.addTable(tableRows, {
    x: 0.7, y: 1.3, w: 11.9, h: 4.3,
    fontSize: 12.5, fontFace: FONT, border: { type: 'solid', color: COLORS.surface, pt: 1 },
    colW: [3.2, 8.7], valign: 'middle', autoPage: false,
  })
  slide.addShape('roundRect', {
    x: 0.7, y: 5.85, w: 11.9, h: 1.05, rectRadius: 0.08,
    fill: { color: COLORS.surface }, line: { color: COLORS.accent2, width: 1 },
  })
  slide.addText([
    { text: 'Status:  ', options: { bold: true, color: COLORS.accent2 } },
    { text: tech.status, options: { color: COLORS.textDim } },
  ], {
    x: 0.95, y: 5.85, w: 11.4, h: 1.05, fontSize: 12.5, fontFace: FONT, valign: 'middle',
  })
}

// --- Slide 5: Impact -------------------------------------------------------
{
  const slide = baseSlide()
  addChrome(slide, impact.heading, 5)
  let y = 1.35
  const rowH = 1.15
  for (const [label, text] of impact.points) {
    slide.addShape('roundRect', {
      x: 0.7, y, w: 1.9, h: rowH - 0.15, rectRadius: 0.08,
      fill: { color: COLORS.surface }, line: { color: COLORS.accent, width: 1 },
    })
    slide.addText(label, {
      x: 0.7, y, w: 1.9, h: rowH - 0.15, fontSize: 14, bold: true, color: COLORS.accent,
      fontFace: FONT, align: 'center', valign: 'middle',
    })
    slide.addText(text, {
      x: 2.85, y, w: 9.75, h: rowH - 0.15, fontSize: 13, color: COLORS.text,
      fontFace: FONT, valign: 'middle',
    })
    y += rowH
  }
}

// --- Slide 6: References + Team -------------------------------------------------------
{
  const slide = baseSlide()
  addChrome(slide, references.heading, 6)
  slide.addText(bulletList(references.sources), {
    x: 0.7, y: 1.3, w: 11.9, h: 3.2,
    fontSize: 13.5, color: COLORS.text, fontFace: FONT, valign: 'top', lineSpacingMultiple: 1.15,
  })
  slide.addShape('line', { x: 0.7, y: 4.75, w: 11.9, h: 0, line: { color: COLORS.surface, width: 1.5 } })
  slide.addText('Team', {
    x: 0.7, y: 4.95, w: 11.9, h: 0.5, fontSize: 18, bold: true, color: COLORS.accent, fontFace: FONT,
  })
  slide.addText([
    { text: `${team.teamName}  —  ${team.institution}`, options: { bold: true, color: COLORS.text, breakLine: true } },
    { text: team.members.join('   •   '), options: { color: COLORS.textDim, breakLine: true } },
    { text: team.contact, options: { color: COLORS.textDim } },
  ], {
    x: 0.7, y: 5.5, w: 11.9, h: 1.3, fontSize: 13, fontFace: FONT,
  })
}

const outFile = 'SIH26041-pitch-deck.pptx'
await pres.writeFile({ fileName: outFile })
console.log(`✓ wrote ${outFile}`)
