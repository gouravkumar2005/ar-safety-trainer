// Same {value, label:{en,hi}} shape used throughout modules.js — kept as
// its own small registry (rather than inline in grievance.js) so it's easy
// to extend without touching screen code.

export const grievanceCategories = [
  { value: 'hazard', label: { en: 'Safety hazard', hi: 'सुरक्षा खतरा' } },
  { value: 'training-content', label: { en: 'Training content issue', hi: 'प्रशिक्षण सामग्री की समस्या' } },
  { value: 'harassment-or-conduct', label: { en: 'Harassment or conduct concern', hi: 'उत्पीड़न या आचरण संबंधी चिंता' } },
  { value: 'other', label: { en: 'Other', hi: 'अन्य' } },
]
