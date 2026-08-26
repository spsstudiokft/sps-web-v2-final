const CATEGORY_KEYS: Record<string, string> = {
  "Client Invoices": "client_invoices", "Real Estate Shoots": "real_estate_shoots", "Drone Aerials": "drone_aerials", "Virtual 3D Tours": "virtual_tours", "Commercial Video": "commercial_video", "Studio Retainer": "studio_retainer", "License Fees": "license_fees", "Other Income": "other_income",
  "Studio Rental & Space": "studio_rental", "Equipment & Camera Gear": "equipment", "Drone Maintenance & FAA": "drone_maintenance", "Software & Cloud Licenses": "software", "Contractor & Freelancer": "contractor", "Marketing & Lead Gen": "marketing", "Travel, Gas & Transport": "travel", "Editing & Post-Production": "post_production", "Office & Supplies": "office", "Taxes & Legal Fees": "taxes", "Other Expense": "other_expense"
};

export function translateBudgetCategory(category: string | null | undefined, tUi: (key: string) => string) {
  if (!category) return tUi("admin.budget.general");
  const key = CATEGORY_KEYS[category];
  return key ? tUi(`admin.budget.category.${key}`) : category;
}
