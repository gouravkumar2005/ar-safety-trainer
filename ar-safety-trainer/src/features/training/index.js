// Training feature: per-module 3D/AR viewer, guided tour, quiz and result.
import './training.css'
import { renderArViewer } from './arViewerScreen.js'
import { renderTour } from './tourScreen.js'
import { renderQuiz } from './quizScreen.js'
import { renderResult } from './resultScreen.js'

export const routes = [
  { path: '/module/:id', render: renderArViewer },
  { path: '/module/:id/tour', render: renderTour },
  { path: '/module/:id/quiz', render: renderQuiz },
  { path: '/module/:id/result', render: renderResult },
]
