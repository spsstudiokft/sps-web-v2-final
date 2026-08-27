const LOGIN_REQUIRED_MESSAGES: Record<string, string> = {
  en: "Email address and password are required.",
  hu: "Az email-cím és a jelszó megadása kötelező.",
  de: "E-Mail-Adresse und Passwort sind erforderlich.",
  es: "El correo electrónico y la contraseña son obligatorios.",
  fr: "L’adresse e-mail et le mot de passe sont obligatoires.",
};

export function getLoginRequiredMessage(language: string): string {
  return LOGIN_REQUIRED_MESSAGES[language] || LOGIN_REQUIRED_MESSAGES.en;
}
