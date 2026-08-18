import fs from "fs";
import path from "path";

// Define the comprehensive dictionary additions for all 5 languages
export const newKeyAdditions: Record<string, { en: string; hu: string; de: string; es: string; fr: string }> = {
  // Navigation & Core
  "Pricing": {
    en: "Pricing",
    hu: "Árak",
    de: "Preise",
    es: "Precios",
    fr: "Tarifs"
  },
  "nav.pricing": {
    en: "Pricing",
    hu: "Árak",
    de: "Preise",
    es: "Precios",
    fr: "Tarifs"
  },
  "admin.nav.team_invites": {
    en: "Team & Invites",
    hu: "Csapat & Meghívók",
    de: "Team & Einladungen",
    es: "Equipo e invitaciones",
    fr: "Équipe et invitations"
  },

  // Auth & Invitation Onboarding Flow
  "auth.invite.page_title": {
    en: "Accept Invitation | SPS Studio",
    hu: "Meghívás elfogadása | SPS Studio",
    de: "Einladung annehmen | SPS Studio",
    es: "Aceptar invitación | SPS Studio",
    fr: "Accepter l'invitation | SPS Studio"
  },
  "auth.invite.subtitle": {
    en: "Management Portal · Team Workspace Onboarding",
    hu: "Vezérlőpult · Csapat munkaterület bejelentkezés",
    de: "Verwaltungsportal · Team-Workspace Onboarding",
    es: "Portal de gestión · Incorporación al espacio de trabajo del equipo",
    fr: "Portail de gestion · Intégration à l'espace de travail d'équipe"
  },
  "auth.invite.verifying": {
    en: "Verifying Invitation...",
    hu: "Meghívás ellenőrzése...",
    de: "Einladung wird überprüft...",
    es: "Verificando invitación...",
    fr: "Vérification de l'invitation..."
  },
  "auth.invite.verifying_sub": {
    en: "Validating security token and role permissions",
    hu: "Biztonsági token és jogosultságok ellenőrzése",
    de: "Sicherheits-Token und Rollenberechtigungen werden validiert",
    es: "Validando token de seguridad y permisos de rol",
    fr: "Validation du jeton de sécurité et des autorisations de rôle"
  },
  "auth.invite.err_missing_token": {
    en: "No invitation token was found in the URL. Please click the invitation link received in your email.",
    hu: "Nem található meghívási token az URL-ben. Kérjük, kattintson az e-mailben kapott meghívó linkre.",
    de: "Kein Einladungs-Token in der URL gefunden. Bitte klicken Sie auf den Link in Ihrer Einladungs-E-Mail.",
    es: "No se encontró ningún token de invitación en la URL. Haga clic en el enlace de invitación recibido en su correo electrónico.",
    fr: "Aucun jeton d'invitation n'a été trouvé dans l'URL. Veuillez cliquer sur le lien d'invitation reçu dans votre e-mail."
  },
  "auth.invite.err_invalid_or_expired": {
    en: "This invitation is invalid or has expired.",
    hu: "Ez a meghívó érvénytelen vagy lejárt.",
    de: "Diese Einladung ist ungültig oder abgelaufen.",
    es: "Esta invitación no es válida o ha caducado.",
    fr: "Cette invitation est invalide ou a expiré."
  },
  "auth.invite.err_network": {
    en: "Could not connect to the authentication server. Please check your internet connection.",
    hu: "Nem sikerült kapcsolódni a hitelesítési kiszolgálóhoz. Kérjük, ellenőrizze az internetkapcsolatot.",
    de: "Verbindung zum Authentifizierungsserver fehlgeschlagen. Bitte überprüfen Sie Ihre Internetverbindung.",
    es: "No se pudo conectar al servidor de autenticación. Comprueba tu conexión a Internet.",
    fr: "Impossible de se connecter au serveur d'authentification. Veuillez vérifier votre connexion Internet."
  },
  "auth.invite.err_name_required": {
    en: "Please enter your full name.",
    hu: "Kérjük, adja meg a teljes nevét.",
    de: "Bitte geben Sie Ihren vollständigen Namen ein.",
    es: "Por favor ingrese su nombre completo.",
    fr: "Veuillez entrer votre nom complet."
  },
  "auth.invite.err_password_length": {
    en: "Password must be at least 6 characters long.",
    hu: "A jelszónak legalább 6 karakterből kell állnia.",
    de: "Das Passwort muss mindestens 6 Zeichen lang sein.",
    es: "La contraseña debe tener al menos 6 caracteres.",
    fr: "Le mot de passe doit comporter au moins 6 caractères."
  },
  "auth.invite.err_password_mismatch": {
    en: "Passwords do not match.",
    hu: "A jelszavak nem egyeznek.",
    de: "Passwörter stimmen nicht überein.",
    es: "Las contraseñas no coinciden.",
    fr: "Les mots de passe ne correspondent pas."
  },
  "auth.invite.err_setup_failed": {
    en: "Failed to set up account. Please try again.",
    hu: "A fiók beállítása nem sikerült. Kérjük, próbálja újra.",
    de: "Kontoerstellung fehlgeschlagen. Bitte versuchen Sie es erneut.",
    es: "Error al configurar la cuenta. Inténtalo de nuevo.",
    fr: "Échec de la configuration du compte. Veuillez réessayer."
  },
  "auth.invite.err_network_submit": {
    en: "Network error occurred during account creation. Please try again.",
    hu: "Hálózati hiba történt a fiók létrehozása közben. Kérjük, próbálja újra.",
    de: "Netzwerkfehler bei der Kontoerstellung. Bitte versuchen Sie es erneut.",
    es: "Se produjo un error de red durante la creación de la cuenta. Inténtalo de nuevo.",
    fr: "Une erreur réseau s'est produite lors de la création du compte. Veuillez réessayer."
  },
  "auth.invite.strength_very_weak": {
    en: "Very Weak",
    hu: "Nagyon gyenge",
    de: "Sehr schwach",
    es: "Muy débil",
    fr: "Très faible"
  },
  "auth.invite.strength_weak": {
    en: "Weak",
    hu: "Gyenge",
    de: "Schwach",
    es: "Débil",
    fr: "Faible"
  },
  "auth.invite.strength_moderate": {
    en: "Moderate",
    hu: "Közepes",
    de: "Mittel",
    es: "Moderado",
    fr: "Moyen"
  },
  "auth.invite.strength_strong": {
    en: "Strong",
    hu: "Erős",
    de: "Stark",
    es: "Fuerte",
    fr: "Fort"
  },
  "auth.invite.strength_very_strong": {
    en: "Very Strong",
    hu: "Nagyon erős",
    de: "Sehr stark",
    es: "Muy fuerte",
    fr: "Très fort"
  },
  "auth.invite.role_desc_admin": {
    en: "Full access to portfolio, deliverables, team management, packages, system settings, and email automations.",
    hu: "Teljes hozzáférés a portfólióhoz, átadókhoz, csapatkezeléshez, csomagokhoz, rendszerbeállításokhoz és e-mail automatizációkhoz.",
    de: "Vollständiger Zugriff auf Portfolio, Ergebnisse, Teamverwaltung, Pakete, Systemeinstellungen und E-Mail-Automatisierungen.",
    es: "Acceso total a portafolio, entregables, gestión de equipos, paquetes, configuraciones del sistema y automatizaciones de correo electrónico.",
    fr: "Accès complet au portfolio, aux livrables, à la gestion d'équipe, aux forfaits, aux paramètres système et aux automatisations d'e-mails."
  },
  "auth.invite.role_desc_viewer": {
    en: "Read-only access to view studio dashboards, media galleries, project timelines, and operational metrics.",
    hu: "Csak olvasható hozzáférés a stúdió irányítópultjaihoz, médiagalériáihoz, projekt ütemterveihez és működési mutatóihoz.",
    de: "Schreibgeschützter Zugriff auf Studio-Dashboards, Mediengalerien, Projektzeitpläne und Betriebsmetriken.",
    es: "Acceso de solo lectura a los paneles del estudio, galerías multimedia, cronogramas de proyectos y métricas operativas.",
    fr: "Accès en lecture seule aux tableaux de bord du studio, aux galeries multimédias, aux calendriers de projets et aux métriques opérationnelles."
  },
  "auth.invite.role_desc_editor": {
    en: "Permission to create and manage photo galleries, milestones, studio services, FAQs, and client submissions.",
    hu: "Jogosultság fotógalériák, mérföldkövek, stúdiószolgáltatások, GYIK és ügyfélbeküldések létrehozására és kezelésére.",
    de: "Berechtigung zum Erstellen und Verwalten von Fotogalerien, Meilensteinen, Studiodiensten, FAQs und Kundeneinreichungen.",
    es: "Permiso para crear y administrar galerías de fotos, hitos, servicios de estudio, preguntas frecuentes y envíos de clientes.",
    fr: "Autorisation de créer et de gérer des galeries de photos, des jalons, des services de studio, des FAQ et des soumissions de clients."
  },
  "auth.invite.success_title": {
    en: "Account Created Successfully!",
    hu: "Fiók sikeresen létrehozva!",
    de: "Konto erfolgreich erstellt!",
    es: "¡Cuenta creada con éxito!",
    fr: "Compte créé avec succès !"
  },
  "auth.invite.success_desc": {
    en: "Welcome to the team, {name}! Your administrator profile is fully activated.",
    hu: "Üdvözöljük a csapatban, {name}! Az Ön profilja sikeresen aktiválásra került.",
    de: "Willkommen im Team, {name}! Ihr Profil ist jetzt vollständig aktiviert.",
    es: "¡Bienvenido al equipo, {name}! Su perfil está completamente activado.",
    fr: "Bienvenue dans l'équipe, {name} ! Votre profil est entièrement activé."
  },
  "auth.invite.redirecting": {
    en: "Redirecting to Admin Studio in {count}s...",
    hu: "Átirányítás az Admin Stúdióba {count} mp múlva...",
    de: "Weiterleitung zum Admin Studio in {count}s...",
    es: "Redirigiendo a Admin Studio en {count}s...",
    fr: "Redirection vers le Studio Admin dans {count}s..."
  },
  "auth.invite.btn_go_admin": {
    en: "Go to Admin Studio Now",
    hu: "Ugrás az Admin Stúdióba",
    de: "Jetzt zum Admin Studio",
    es: "Ir a Admin Studio ahora",
    fr: "Aller au Studio Admin maintenant"
  },
  "auth.invite.expired_title": {
    en: "Invitation Expired",
    hu: "A meghívó lejárt",
    de: "Einladung abgelaufen",
    es: "Invitación expirada",
    fr: "Invitation expirée"
  },
  "auth.invite.invalid_title": {
    en: "Invalid Invitation",
    hu: "Érvénytelen meghívó",
    de: "Ungültige Einladung",
    es: "Invitación no válida",
    fr: "Invitation invalide"
  },
  "auth.invite.already_used_title": {
    en: "Invitation Already Used",
    hu: "A meghívó már felhasználva",
    de: "Einladung bereits verwendet",
    es: "Invitación ya utilizada",
    fr: "Invitation déjà utilisée"
  },
  "auth.invite.revoked_title": {
    en: "Invitation Revoked",
    hu: "A meghívó visszavonva",
    de: "Einladung widerrufen",
    es: "Invitación revocada",
    fr: "Invitation révoquée"
  },
  "auth.invite.btn_back_login": {
    en: "Return to Login",
    hu: "Vissza a bejelentkezéshez",
    de: "Zurück zur Anmeldung",
    es: "Volver al inicio de sesión",
    fr: "Retour à la connexion"
  },
  "auth.invite.btn_contact_owner": {
    en: "Contact Workspace Owner",
    hu: "Kapcsolat a munkaterület tulajdonosával",
    de: "Workspace-Eigentümer kontaktieren",
    es: "Contactar al propietario del espacio de trabajo",
    fr: "Contacter le propriétaire de l'espace de travail"
  },
  "auth.invite.join_studio": {
    en: "Join {studio}",
    hu: "Csatlakozás a(z) {studio} stúdióhoz",
    de: "Beitreten {studio}",
    es: "Unirse a {studio}",
    fr: "Rejoindre {studio}"
  },
  "auth.invite.invited_by": {
    en: "You have been invited by {inviter} to join as {role}.",
    hu: "{inviter} meghívta Önt a csapatba {role} szerepkörben.",
    de: "Sie wurden von {inviter} eingeladen, als {role} beizutreten.",
    es: "Has sido invitado por {inviter} a unirte como {role}.",
    fr: "Vous avez été invité par {inviter} à rejoindre en tant que {role}."
  },
  "auth.invite.custom_message_label": {
    en: "Custom message from inviter:",
    hu: "Személyes üzenet a meghívótól:",
    de: "Persönliche Nachricht vom Einladenden:",
    es: "Mensaje personalizado del remitente:",
    fr: "Message personnalisé de la personne qui vous invite :"
  },
  "auth.invite.assigned_role": {
    en: "Assigned Role & Access Level",
    hu: "Kijelölt szerepkör és hozzáférési szint",
    de: "Zugewiesene Rolle & Zugriffsebene",
    es: "Rol asignado y nivel de acceso",
    fr: "Rôle assigné et niveau d'accès"
  },
  "auth.invite.email_label": {
    en: "Email Address",
    hu: "E-mail cím",
    de: "E-Mail-Adresse",
    es: "Dirección de correo electrónico",
    fr: "Adresse e-mail"
  },
  "auth.invite.name_label": {
    en: "Full Name *",
    hu: "Teljes név *",
    de: "Vollständiger Name *",
    es: "Nombre completo *",
    fr: "Nom complet *"
  },
  "auth.invite.name_ph": {
    en: "e.g. Alex Morgan",
    hu: "pl. Kovács Péter",
    de: "z.B. Max Mustermann",
    es: "ej. Alex Morgan",
    fr: "ex. Alex Morgan"
  },
  "auth.invite.phone_label": {
    en: "Phone Number (Optional)",
    hu: "Telefonszám (Opcionális)",
    de: "Telefonnummer (Optional)",
    es: "Número de teléfono (Opcional)",
    fr: "Numéro de téléphone (Optionnel)"
  },
  "auth.invite.phone_ph": {
    en: "e.g. +1 (555) 019-2834",
    hu: "pl. +36 30 123 4567",
    de: "z.B. +49 170 1234567",
    es: "ej. +34 612 345 678",
    fr: "ex. +33 6 12 34 56 78"
  },
  "auth.invite.workspace_label": {
    en: "Workspace / Department (Optional)",
    hu: "Munkaterület / Részleg (Opcionális)",
    de: "Workspace / Abteilung (Optional)",
    es: "Espacio de trabajo / Departamento (Opcional)",
    fr: "Espace de travail / Département (Optionnel)"
  },
  "auth.invite.password_label": {
    en: "Create Password *",
    hu: "Jelszó létrehozása *",
    de: "Passwort erstellen *",
    es: "Crear contraseña *",
    fr: "Créer un mot de passe *"
  },
  "auth.invite.password_ph": {
    en: "At least 6 characters (mix of upper, lower, numbers)",
    hu: "Legalább 6 karakter (kis- és nagybetűk, számok)",
    de: "Mindestens 6 Zeichen (Groß-, Kleinbuchstaben, Zahlen)",
    es: "Al menos 6 caracteres (mayúsculas, minúsculas, números)",
    fr: "Au moins 6 caractères (majuscules, minuscules, chiffres)"
  },
  "auth.invite.confirm_password_label": {
    en: "Confirm Password *",
    hu: "Jelszó megerősítése *",
    de: "Passwort bestätigen *",
    es: "Confirmar contraseña *",
    fr: "Confirmer le mot de passe *"
  },
  "auth.invite.confirm_password_ph": {
    en: "Repeat your chosen password",
    hu: "Ismételje meg a választott jelszót",
    de: "Gewähltes Passwort wiederholen",
    es: "Repite la contraseña elegida",
    fr: "Répétez le mot de passe choisi"
  },
  "auth.invite.password_strength": {
    en: "Password Strength:",
    hu: "Jelszó erőssége:",
    de: "Passwortstärke:",
    es: "Fortaleza de la contraseña:",
    fr: "Force du mot de passe :"
  },
  "auth.invite.btn_submit": {
    en: "Complete Account Setup",
    hu: "Fiók beállításának befejezése",
    de: "Konto-Einrichtung abschließen",
    es: "Completar configuración de cuenta",
    fr: "Finaliser la configuration du compte"
  },
  "auth.invite.btn_submitting": {
    en: "Setting up account...",
    hu: "Fiók beállítása folyamatban...",
    de: "Konto wird eingerichtet...",
    es: "Configurando cuenta...",
    fr: "Configuration du compte en cours..."
  },
  "auth.invite.security_note": {
    en: "Security Note: Your login credentials are encrypted with industry-standard bcrypt hashing.",
    hu: "Biztonsági megjegyzés: A bejelentkezési adatok iparági szabványú bcrypt titkosítással védettek.",
    de: "Sicherheitshinweis: Ihre Anmeldedaten sind mit dem Industriestandard bcrypt verschlüsselt.",
    es: "Nota de seguridad: Sus credenciales de inicio de sesión están protegidas con encriptación bcrypt.",
    fr: "Note de sécurité : Vos identifiants de connexion sont protégés par un chiffrement standard bcrypt."
  },

  // Team & Invitation Admin Management
  "admin.team.page_title": {
    en: "Team & Invitations",
    hu: "Csapat & Meghívók",
    de: "Team & Einladungen",
    es: "Equipo e invitaciones",
    fr: "Équipe et invitations"
  },
  "admin.team.page_subtitle": {
    en: "Manage studio staff accounts, role-based permissions, and invite new administrators or editors.",
    hu: "Kezelje a stúdió munkatársait, jogosultságaikat és hívjon meg új adminisztrátorokat vagy szerkesztőket.",
    de: "Verwalten Sie Konten von Studiomitarbeitern, rollenbasierte Berechtigungen und laden Sie neue Administratoren oder Editoren ein.",
    es: "Administre las cuentas del personal del estudio, los permisos basados en roles e invite a nuevos administradores o editores.",
    fr: "Gérez les comptes du personnel du studio, les autorisations par rôle et invitez de nouveaux administrateurs ou éditeurs."
  },
  "admin.team.tab_invitations": {
    en: "Invitations",
    hu: "Meghívók",
    de: "Einladungen",
    es: "Invitaciones",
    fr: "Invitations"
  },
  "admin.team.tab_members": {
    en: "Active Members",
    hu: "Aktív tagok",
    de: "Aktive Mitglieder",
    es: "Miembros activos",
    fr: "Membres actifs"
  },
  "admin.team.tab_template": {
    en: "Email Template",
    hu: "E-mail sablon",
    de: "E-Mail-Vorlage",
    es: "Plantilla de correo",
    fr: "Modèle d'e-mail"
  },
  "admin.team.btn_invite_member": {
    en: "Invite Team Member",
    hu: "Csapattag meghívása",
    de: "Teammitglied einladen",
    es: "Invitar miembro del equipo",
    fr: "Inviter un membre de l'équipe"
  },
  "admin.team.btn_refresh": {
    en: "Refresh",
    hu: "Frissítés",
    de: "Aktualisieren",
    es: "Actualizar",
    fr: "Actualiser"
  },
  "admin.team.search_invites_ph": {
    en: "Search invitations by email, name, or workspace...",
    hu: "Keresés e-mail, név vagy munkaterület alapján...",
    de: "Einladungen nach E-Mail, Name oder Workspace durchsuchen...",
    es: "Buscar invitaciones por correo, nombre o espacio de trabajo...",
    fr: "Rechercher des invitations par e-mail, nom ou espace de travail..."
  },
  "admin.team.search_members_ph": {
    en: "Search team members by name, email, phone...",
    hu: "Csapattagok keresése név, e-mail, telefon alapján...",
    de: "Teammitglieder nach Name, E-Mail, Telefon suchen...",
    es: "Buscar miembros del equipo por nombre, correo o teléfono...",
    fr: "Rechercher des membres par nom, e-mail, téléphone..."
  },
  "admin.team.filter_all_statuses": {
    en: "All Statuses",
    hu: "Minden állapot",
    de: "Alle Status",
    es: "Todos los estados",
    fr: "Tous les statuts"
  },
  "admin.team.filter_all_roles": {
    en: "All Roles",
    hu: "Minden szerepkör",
    de: "Alle Rollen",
    es: "Todos los roles",
    fr: "Tous les rôles"
  },
  "admin.team.status_pending": {
    en: "Pending",
    hu: "Függőben",
    de: "Ausstehend",
    es: "Pendiente",
    fr: "En attente"
  },
  "admin.team.status_accepted": {
    en: "Accepted",
    hu: "Elfogadva",
    de: "Angenommen",
    es: "Aceptada",
    fr: "Acceptée"
  },
  "admin.team.status_expired": {
    en: "Expired",
    hu: "Lejárt",
    de: "Abgelaufen",
    es: "Expirada",
    fr: "Expirée"
  },
  "admin.team.status_revoked": {
    en: "Revoked",
    hu: "Visszavonva",
    de: "Widerrufen",
    es: "Revocada",
    fr: "Révoquée"
  },
  "admin.team.status_active": {
    en: "Active",
    hu: "Aktív",
    de: "Aktiv",
    es: "Activo",
    fr: "Actif"
  },
  "admin.team.status_inactive": {
    en: "Inactive",
    hu: "Inaktív",
    de: "Inaktiv",
    es: "Inactivo",
    fr: "Inactif"
  },
  "admin.team.role_admin": {
    en: "Administrator",
    hu: "Adminisztrátor",
    de: "Administrator",
    es: "Administrador",
    fr: "Administrateur"
  },
  "admin.team.role_editor": {
    en: "Editor",
    hu: "Szerkesztő",
    de: "Editor",
    es: "Editor",
    fr: "Éditeur"
  },
  "admin.team.role_viewer": {
    en: "Viewer",
    hu: "Megtekintő",
    de: "Betrachter",
    es: "Visualizador",
    fr: "Lecteur"
  },
  "admin.team.th_recipient": {
    en: "Recipient",
    hu: "Címzett",
    de: "Empfänger",
    es: "Destinatario",
    fr: "Destinataire"
  },
  "admin.team.th_role_workspace": {
    en: "Role & Workspace",
    hu: "Szerepkör & Munkaterület",
    de: "Rolle & Workspace",
    es: "Rol y espacio de trabajo",
    fr: "Rôle et espace de travail"
  },
  "admin.team.th_status": {
    en: "Status",
    hu: "Állapot",
    de: "Status",
    es: "Estado",
    fr: "Statut"
  },
  "admin.team.th_sent_expires": {
    en: "Sent / Expires",
    hu: "Elküldve / Lejárat",
    de: "Gesendet / Läuft ab",
    es: "Enviado / Caduca",
    fr: "Envoyé / Expire"
  },
  "admin.team.th_token_link": {
    en: "Invitation Link",
    hu: "Meghívó link",
    de: "Einladungslink",
    es: "Enlace de invitación",
    fr: "Lien d'invitation"
  },
  "admin.team.th_actions": {
    en: "Actions",
    hu: "Műveletek",
    de: "Aktionen",
    es: "Acciones",
    fr: "Actions"
  },
  "admin.team.th_member": {
    en: "Member",
    hu: "Tag",
    de: "Mitglied",
    es: "Miembro",
    fr: "Membre"
  },
  "admin.team.th_role": {
    en: "Role",
    hu: "Szerepkör",
    de: "Rolle",
    es: "Rol",
    fr: "Rôle"
  },
  "admin.team.th_workspace": {
    en: "Workspace",
    hu: "Munkaterület",
    de: "Workspace",
    es: "Espacio de trabajo",
    fr: "Espace de travail"
  },
  "admin.team.th_last_login": {
    en: "Last Login",
    hu: "Utolsó belépés",
    de: "Letzter Login",
    es: "Último acceso",
    fr: "Dernière connexion"
  },
  "admin.team.th_joined": {
    en: "Joined",
    hu: "Csatlakozott",
    de: "Beigetreten",
    es: "Unido",
    fr: "Inscrit"
  },
  "admin.team.copy_link": {
    en: "Copy link",
    hu: "Link másolása",
    de: "Link kopieren",
    es: "Copiar enlace",
    fr: "Copier le lien"
  },
  "admin.team.copied": {
    en: "Copied!",
    hu: "Másolva!",
    de: "Kopiert!",
    es: "¡Copiado!",
    fr: "Copié !"
  },
  "admin.team.open_link": {
    en: "Open link",
    hu: "Link megnyitása",
    de: "Link öffnen",
    es: "Abrir enlace",
    fr: "Ouvrir le lien"
  },
  "admin.team.resend_invite": {
    en: "Resend Invitation",
    hu: "Meghívó újraküldése",
    de: "Einladung erneut senden",
    es: "Reenviar invitación",
    fr: "Renvoyer l'invitation"
  },
  "admin.team.revoke_invite": {
    en: "Revoke Invitation",
    hu: "Meghívó visszavonása",
    de: "Einladung widerrufen",
    es: "Revocar invitación",
    fr: "Révoquer l'invitation"
  },
  "admin.team.delete_record": {
    en: "Delete Record",
    hu: "Bejegyzés törlése",
    de: "Eintrag löschen",
    es: "Eliminar registro",
    fr: "Supprimer l'enregistrement"
  },
  "admin.team.edit_member": {
    en: "Edit Member",
    hu: "Tag szerkesztése",
    de: "Mitglied bearbeiten",
    es: "Editar miembro",
    fr: "Modifier le membre"
  },
  "admin.team.modal_invite_title": {
    en: "Invite New Team Member",
    hu: "Új csapattag meghívása",
    de: "Neues Teammitglied einladen",
    es: "Invitar nuevo miembro del equipo",
    fr: "Inviter un nouveau membre d'équipe"
  },
  "admin.team.modal_invite_subtitle": {
    en: "Generate a secure invitation link and dispatch onboarding instructions.",
    hu: "Biztonságos meghívó link generálása és e-mail küldése.",
    de: "Sicheren Einladungslink generieren und Onboarding-Anweisungen senden.",
    es: "Generar un enlace de invitación seguro y enviar instrucciones.",
    fr: "Générer un lien d'invitation sécurisé et envoyer les instructions."
  },
  "admin.team.field_email": {
    en: "Email Address *",
    hu: "E-mail cím *",
    de: "E-Mail-Adresse *",
    es: "Dirección de correo electrónico *",
    fr: "Adresse e-mail *"
  },
  "admin.team.field_name": {
    en: "Full Name (Optional)",
    hu: "Teljes név (Opcionális)",
    de: "Vollständiger Name (Optional)",
    es: "Nombre completo (Opcional)",
    fr: "Nom complet (Optionnel)"
  },
  "admin.team.field_role": {
    en: "Role & Access Level",
    hu: "Szerepkör és jogosultsági szint",
    de: "Rolle & Zugriffsebene",
    es: "Rol y nivel de acceso",
    fr: "Rôle et niveau d'accès"
  },
  "admin.team.field_workspace": {
    en: "Workspace / Department",
    hu: "Munkaterület / Részleg",
    de: "Workspace / Abteilung",
    es: "Espacio de trabajo / Departamento",
    fr: "Espace de travail / Département"
  },
  "admin.team.field_custom_message": {
    en: "Custom Message / Note (Optional)",
    hu: "Személyes üzenet / megjegyzés (Opcionális)",
    de: "Persönliche Nachricht / Notiz (Optional)",
    es: "Mensaje personalizado / Nota (Opcional)",
    fr: "Message personnalisé / Note (Optionnel)"
  },
  "admin.team.field_send_email": {
    en: "Send invitation email automatically via Resend",
    hu: "Meghívó e-mail automatikus küldése Resend-en keresztül",
    de: "Einladungs-E-Mail automatisch über Resend senden",
    es: "Enviar correo de invitación automáticamente a través de Resend",
    fr: "Envoyer l'e-mail d'invitation automatiquement via Resend"
  },
  "admin.team.btn_send_invite": {
    en: "Send Invitation",
    hu: "Meghívó küldése",
    de: "Einladung senden",
    es: "Enviar invitación",
    fr: "Envoyer l'invitation"
  },
  "admin.team.btn_sending": {
    en: "Sending...",
    hu: "Küldés...",
    de: "Wird gesendet...",
    es: "Enviando...",
    fr: "Envoi en cours..."
  },
  "admin.team.modal_edit_title": {
    en: "Edit Team Member",
    hu: "Csapattag szerkesztése",
    de: "Teammitglied bearbeiten",
    es: "Editar miembro del equipo",
    fr: "Modifier le membre de l'équipe"
  },
  "admin.team.modal_edit_subtitle": {
    en: "Update role permissions, workspace assignment, and account status.",
    hu: "Jogosultságok, munkaterület és fiók állapotának módosítása.",
    de: "Rollenberechtigungen, Workspace-Zuweisung und Kontostatus aktualisieren.",
    es: "Actualizar permisos de rol, asignación de espacio de trabajo y estado de cuenta.",
    fr: "Mettre à jour les autorisations de rôle, l'espace de travail et le statut du compte."
  },
  "admin.team.field_phone": {
    en: "Phone Number",
    hu: "Telefonszám",
    de: "Telefonnummer",
    es: "Número de teléfono",
    fr: "Numéro de téléphone"
  },
  "admin.team.field_active_status": {
    en: "Account Active (User can log in)",
    hu: "Fiók aktív (A felhasználó bejelentkezhet)",
    de: "Konto aktiv (Benutzer kann sich anmelden)",
    es: "Cuenta activa (El usuario puede iniciar sesión)",
    fr: "Compte actif (L'utilisateur peut se connecter)"
  },
  "admin.team.btn_save_member": {
    en: "Save Changes",
    hu: "Változtatások mentése",
    de: "Änderungen speichern",
    es: "Guardar cambios",
    fr: "Enregistrer les modifications"
  },
  "admin.team.btn_saving": {
    en: "Saving...",
    hu: "Mentés...",
    de: "Wird gespeichert...",
    es: "Guardando...",
    fr: "Enregistrement..."
  },
  "admin.team.success_modal_title": {
    en: "Invitation Generated Successfully!",
    hu: "A meghívó sikeresen létrejött!",
    de: "Einladung erfolgreich erstellt!",
    es: "¡Invitación generada con éxito!",
    fr: "Invitation générée avec succès !"
  },
  "admin.team.success_modal_desc": {
    en: "The secure onboarding token has been created. You can share this direct link with the recipient.",
    hu: "A biztonságos token létrejött. Ezt a közvetlen linket megoszthatja a címzettel.",
    de: "Das sichere Onboarding-Token wurde erstellt. Sie können diesen Direktlink mit dem Empfänger teilen.",
    es: "Se ha creado el token de incorporación seguro. Puedes compartir este enlace directo con el destinatario.",
    fr: "Le jeton d'intégration sécurisé a été créé. Vous pouvez partager ce lien direct avec le destinataire."
  },
  "admin.team.email_dispatched": {
    en: "Email dispatched successfully",
    hu: "E-mail sikeresen elküldve",
    de: "E-Mail erfolgreich versendet",
    es: "Correo enviado con éxito",
    fr: "E-mail envoyé avec succès"
  },
  "admin.team.email_skipped": {
    en: "Email not sent (Manual link sharing mode)",
    hu: "E-mail nem lett elküldve (Kézi linkmegosztási mód)",
    de: "E-Mail nicht gesendet (Manueller Link-Modus)",
    es: "Correo no enviado (Modo de compartir enlace manual)",
    fr: "E-mail non envoyé (Mode de partage manuel)"
  },
  "admin.team.btn_copy_accept_link": {
    en: "Copy Invitation URL",
    hu: "Meghívó link másolása",
    de: "Einladungs-URL kopieren",
    es: "Copiar URL de invitación",
    fr: "Copier l'URL d'invitation"
  },
  "admin.team.btn_close": {
    en: "Close",
    hu: "Bezárás",
    de: "Schließen",
    es: "Cerrar",
    fr: "Fermer"
  },
  "admin.team.template_preview_title": {
    en: "Invitation Email Template Preview",
    hu: "Meghívó e-mail sablon előnézet",
    de: "Vorschau der Einladungs-E-Mail-Vorlage",
    es: "Vista previa de la plantilla de correo de invitación",
    fr: "Aperçu du modèle d'e-mail d'invitation"
  },
  "admin.team.template_preview_subtitle": {
    en: "Live visual simulation of the transactional email sent to invited staff.",
    hu: "A munkatársaknak küldött tranzakciós e-mail valós idejű szimulációja.",
    de: "Live-Simulation der Transaktions-E-Mail an eingeladene Mitarbeiter.",
    es: "Simulación visual en vivo del correo transaccional enviado al personal invitado.",
    fr: "Simulation visuelle en direct de l'e-mail transactionnel envoyé au personnel invité."
  },
  "admin.team.template_sender": {
    en: "From: SPS Studio <onboarding@resend.dev>",
    hu: "Feladó: SPS Studio <onboarding@resend.dev>",
    de: "Von: SPS Studio <onboarding@resend.dev>",
    es: "De: SPS Studio <onboarding@resend.dev>",
    fr: "De : SPS Studio <onboarding@resend.dev>"
  },
  "admin.team.template_subject": {
    en: "Subject: You've been invited to SPS Studio as {role}",
    hu: "Tárgy: Meghívást kapott az SPS Studio csapatába ({role})",
    de: "Betreff: Sie wurden als {role} zu SPS Studio eingeladen",
    es: "Asunto: Has sido invitado a SPS Studio como {role}",
    fr: "Objet : Vous avez été invité à SPS Studio en tant que {role}"
  },
  "admin.team.empty_invitations": {
    en: "No invitations found.",
    hu: "Nem találhatók meghívók.",
    de: "Keine Einladungen gefunden.",
    es: "No se encontraron invitaciones.",
    fr: "Aucune invitation trouvée."
  },
  "admin.team.empty_members": {
    en: "No team members found.",
    hu: "Nem találhatók csapattagok.",
    de: "Keine Teammitglieder gefunden.",
    es: "No se encontraron miembros del equipo.",
    fr: "Aucun membre de l'équipe trouvé."
  },
  "admin.team.confirm_revoke": {
    en: "Are you sure you want to revoke this invitation? The token link will immediately stop working.",
    hu: "Biztosan vissza szeretné vonni ezt a meghívót? A token link azonnal érvényét veszti.",
    de: "Möchten Sie diese Einladung wirklich widerrufen? Der Link funktioniert ab sofort nicht mehr.",
    es: "¿Estás seguro de que deseas revocar esta invitación? El enlace dejará de funcionar inmediatamente.",
    fr: "Êtes-vous sûr de vouloir révoquer cette invitation ? Le lien cessera immédiatement de fonctionner."
  },
  "admin.team.confirm_delete_invite": {
    en: "Delete this invitation log record completely?",
    hu: "Véglegesen törli ezt a meghívási naplóbejegyzést?",
    de: "Diesen Einladungseintrag vollständig löschen?",
    es: "¿Eliminar este registro de invitación por completo?",
    fr: "Supprimer complètement cet enregistrement d'invitation ?"
  },
  "admin.team.never_logged_in": {
    en: "Never",
    hu: "Soha",
    de: "Nie",
    es: "Nunca",
    fr: "Jamais"
  },
  "admin.team.you_badge": {
    en: "You",
    hu: "Ön",
    de: "Sie",
    es: "Tú",
    fr: "Vous"
  },

  // Contact Page Enhancements
  "contact.selected_package": {
    en: "Selected Package / Plan:",
    hu: "Kiválasztott csomag / ajánlat:",
    de: "Ausgewähltes Paket / Angebot:",
    es: "Paquete / plan seleccionado:",
    fr: "Forfait / plan sélectionné :"
  },
  "contact.clear_plan": {
    en: "Clear Selection",
    hu: "Kijelölés törlése",
    de: "Auswahl aufheben",
    es: "Borrar selección",
    fr: "Effacer la sélection"
  },
  "contact.select_plan_optional": {
    en: "Select a Pricing Plan or Bundle (Optional)",
    hu: "Válasszon árcsomagot vagy csomagajánlatot (Opcionális)",
    de: "Preispaket oder Bundle auswählen (Optional)",
    es: "Seleccione un plan de precios o paquete (Opcional)",
    fr: "Sélectionnez un forfait ou pack (Optionnel)"
  },
  "contact.add_on_services": {
    en: "A La Carte Add-On Services:",
    hu: "Választható kiegészítő szolgáltatások:",
    de: "Zusätzliche Einzelleistungen:",
    es: "Servicios adicionales a la carta:",
    fr: "Services supplémentaires à la carte :"
  },
  "contact.estimated_cost_title": {
    en: "Interactive Cost Estimate",
    hu: "Interaktív költségbecslés",
    de: "Interaktive Kostenschätzung",
    es: "Estimación interactiva de costos",
    fr: "Estimation interactive des coûts"
  },
  "contact.travel_distance_label": {
    en: "Estimated Travel Distance (One-way km from studio):",
    hu: "Becsült utazási távolság (Egyirányú km a stúdiótól):",
    de: "Geschätzte Reisedistanz (Einfache Fahrt in km):",
    es: "Distancia de viaje estimada (Km de ida desde el estudio):",
    fr: "Distance de déplacement estimée (km aller simple depuis le studio) :"
  },
  "contact.travel_distance_desc": {
    en: "Round-trip distance and applicable travel fee tiers will be computed automatically.",
    hu: "Az oda-vissza távolság és az utazási díjak automatikusan kiszámításra kerülnek.",
    de: "Hin- und Rückfahrt sowie anfallende Reisegebühren werden automatisch berechnet.",
    es: "La distancia de ida y vuelta y las tarifas de viaje se calcularán automáticamente.",
    fr: "La distance aller-retour et les frais de déplacement applicables seront calculés automatiquement."
  },
  "contact.estimated_total": {
    en: "Estimated Total:",
    hu: "Becsült végösszeg:",
    de: "Geschätzte Gesamtsumme:",
    es: "Total estimado:",
    fr: "Total estimé :"
  },
  "contact.reset_template": {
    en: "Reset to Default Template",
    hu: "Visszaállítás az alapértelmezett sablonra",
    de: "Auf Standardvorlage zurücksetzen",
    es: "Restablecer plantilla predeterminada",
    fr: "Réinitialiser le modèle par défaut"
  },
  "contact.address": {
    en: "Studio Location",
    hu: "Stúdió címe",
    de: "Studio-Standort",
    es: "Ubicación del estudio",
    fr: "Adresse du studio"
  },
  "contact.hours": {
    en: "Opening Hours",
    hu: "Nyitvatartás",
    de: "Öffnungszeiten",
    es: "Horario de atención",
    fr: "Heures d'ouverture"
  },
  "public.portfolio.desc": {
    en: "Explore our complete visual showcases featuring high-resolution architectural photography, 4K walkthrough motion reels, and cinematic aerial drone captures.",
    hu: "Fedezze fel teljes vizuális bemutatóinkat nagyfelbontású építészeti fotókkal, 4K bejárási videókkal és drónfelvételekkel.",
    de: "Entdecken Sie unsere visuellen Showcases mit hochauflösender Architekturfotografie, 4K-Videorundgängen und Drohnenaufnahmen.",
    es: "Explore nuestras muestras visuales completas con fotografía arquitectónica de alta resolución, videos 4K y tomas aéreas con drones.",
    fr: "Découvrez nos présentations visuelles complètes avec des photographies d'architecture haute résolution, des visites vidéo 4K et des prises de vue aériennes par drone."
  },

  // Admin Extra Services
  "admin.extra_services.error_title": {
    en: "Service title is required.",
    hu: "A szolgáltatás címe kötelező.",
    de: "Diensttitel ist erforderlich.",
    es: "El título del servicio es obligatorio.",
    fr: "Le titre du service est requis."
  },
  "admin.extra_services.error_price": {
    en: "Valid price is required.",
    hu: "Érvényes ár megadása kötelező.",
    de: "Gültiger Preis ist erforderlich.",
    es: "Se requiere un precio válido.",
    fr: "Un prix valide est requis."
  },
  "admin.extra_services.edit_title": {
    en: "Edit Extra Service / Add-On",
    hu: "Kiegészítő szolgáltatás szerkesztése",
    de: "Zusatzleistung bearbeiten",
    es: "Editar servicio adicional",
    fr: "Modifier le service supplémentaire"
  },
  "admin.extra_services.create_title": {
    en: "Create Extra Service / Add-On",
    hu: "Új kiegészítő szolgáltatás létrehozása",
    de: "Zusatzleistung erstellen",
    es: "Crear servicio adicional",
    fr: "Créer un service supplémentaire"
  },
  "admin.extra_services.modal_subtitle": {
    en: "Configure a la carte service add-ons, pricing models, and quantity limits.",
    hu: "Egyedi kiegészítő szolgáltatások, árazási modellek és mennyiségi korlátok beállítása.",
    de: "Konfigurieren Sie Zusatzleistungen, Preismodelle und Mengengrenzen.",
    es: "Configure servicios adicionales, modelos de precios y límites de cantidad.",
    fr: "Configurez les services à la carte, les modèles de tarification et les limites de quantité."
  },
  "admin.extra_services.field_title": {
    en: "Service Title *",
    hu: "Szolgáltatás megnevezése *",
    de: "Diensttitel *",
    es: "Título del servicio *",
    fr: "Titre du service *"
  },
  "admin.extra_services.field_subtitle": {
    en: "Subtitle / Short Summary",
    hu: "Alcím / Rövid összefoglaló",
    de: "Untertitel / Kurzbeschreibung",
    es: "Subtítulo / Resumen breve",
    fr: "Sous-titre / Bref résumé"
  },
  "admin.extra_services.field_category": {
    en: "Category / Service Group",
    hu: "Kategória / Szolgáltatáscsoport",
    de: "Kategorie / Dienstleistungsgruppe",
    es: "Categoría / Grupo de servicio",
    fr: "Catégorie / Groupe de services"
  },
  "admin.extra_services.field_icon": {
    en: "Icon Name",
    hu: "Ikon megnevezése",
    de: "Icon-Name",
    es: "Nombre del icono",
    fr: "Nom de l'icône"
  },
  "admin.extra_services.pricing_header": {
    en: "Pricing & Billing Model",
    hu: "Árazás és elszámolási modell",
    de: "Preisgestaltung & Abrechnungsmodell",
    es: "Modelo de precios y facturación",
    fr: "Modèle de tarification et de facturation"
  },
  "admin.extra_services.price_type": {
    en: "Pricing Structure",
    hu: "Árszerkezet",
    de: "Preisstruktur",
    es: "Estructura de precios",
    fr: "Structure tarifaire"
  },
  "admin.extra_services.billing_type": {
    en: "Billing Frequency",
    hu: "Elszámolási gyakoriság",
    de: "Abrechnungshäufigkeit",
    es: "Frecuencia de facturación",
    fr: "Fréquence de facturation"
  },
  "admin.extra_services.field_price": {
    en: "Price *",
    hu: "Ár *",
    de: "Preis *",
    es: "Precio *",
    fr: "Prix *"
  },
  "admin.extra_services.field_original_price": {
    en: "Original Price (Strike-through)",
    hu: "Eredeti ár (Áthúzva megjelenítve)",
    de: "Originalpreis (durchgestrichen)",
    es: "Precio original (tachado)",
    fr: "Prix d'origine (barré)"
  },
  "admin.extra_services.field_currency": {
    en: "Currency",
    hu: "Pénznem",
    de: "Währung",
    es: "Moneda",
    fr: "Devise"
  },
  "admin.extra_services.field_unit": {
    en: "Unit Label (e.g., photo, room, km)",
    hu: "Mértékegység címke (pl. fotó, szoba, km)",
    de: "Einheitenbezeichnung (z.B. Foto, Raum, km)",
    es: "Etiqueta de unidad (ej. foto, habitación, km)",
    fr: "Libellé d'unité (ex. photo, pièce, km)"
  },
  "admin.extra_services.field_quantity_allowed": {
    en: "Quantity Configuration",
    hu: "Mennyiség beállításai",
    de: "Mengenkonfiguration",
    es: "Configuración de cantidad",
    fr: "Configuration de la quantité"
  },
  "admin.extra_services.allow_quantity_label": {
    en: "Allow client to select multiple units (Quantity selector)",
    hu: "Ügyfél választhat több egységet (Mennyiségválasztó engedélyezése)",
    de: "Kunden erlauben, mehrere Einheiten zu wählen (Mengenauswahl)",
    es: "Permitir al cliente seleccionar múltiples unidades",
    fr: "Permettre au client de sélectionner plusieurs unités"
  },
  "admin.extra_services.min_qty": {
    en: "Minimum Quantity",
    hu: "Minimális mennyiség",
    de: "Mindestmenge",
    es: "Cantidad mínima",
    fr: "Quantité minimale"
  },
  "admin.extra_services.max_qty": {
    en: "Maximum Quantity",
    hu: "Maximális mennyiség",
    de: "Höchstmenge",
    es: "Cantidad máxima",
    fr: "Quantité maximale"
  },
  "admin.extra_services.restrictions_header": {
    en: "Visibility & Highlights",
    hu: "Láthatóság és kiemelések",
    de: "Sichtbarkeit & Highlights",
    es: "Visibilidad y destacados",
    fr: "Visibilité et mises en avant"
  },
  "admin.extra_services.field_description": {
    en: "Detailed Description",
    hu: "Részletes leírás",
    de: "Detaillierte Beschreibung",
    es: "Descripción detallada",
    fr: "Description détaillée"
  },
  "admin.extra_services.featured_toggle": {
    en: "Feature this add-on prominently",
    hu: "Kiegészítő kiemelése",
    de: "Diesen Zusatz hervorheben",
    es: "Destacar este servicio adicional",
    fr: "Mettre en avant ce service"
  },
  "admin.extra_services.enabled_toggle": {
    en: "Visible on website contact & pricing forms",
    hu: "Látható a weboldal űrlapjain és árlistáján",
    de: "Auf Website-Kontakt- & Preisformularen sichtbar",
    es: "Visible en formularios de contacto y precios",
    fr: "Visible sur les formulaires de contact et tarifs"
  },
  "admin.extra_services.create_btn": {
    en: "Create Service",
    hu: "Szolgáltatás mentése",
    de: "Dienstleistung erstellen",
    es: "Crear servicio",
    fr: "Créer le service"
  },

  // Admin Fee Rules
  "admin.fee_rules.error_name": {
    en: "Rule name is required.",
    hu: "A szabály neve kötelező.",
    de: "Regelname ist erforderlich.",
    es: "El nombre de la regla es obligatorio.",
    fr: "Le nom de la règle est requis."
  },
  "admin.fee_rules.error_amount": {
    en: "Valid fee amount is required.",
    hu: "Érvényes összeg megadása kötelező.",
    de: "Gültiger Gebührenbetrag ist erforderlich.",
    es: "Se requiere un monto de tarifa válido.",
    fr: "Un montant de frais valide est requis."
  },
  "admin.fee_rules.edit_title": {
    en: "Edit Travel / Policy Fee Rule",
    hu: "Utazási / szabályzati díj szerkesztése",
    de: "Reise- / Gebührenregel bearbeiten",
    es: "Editar regla de tarifa de viaje / política",
    fr: "Modifier la règle de frais de déplacement / politique"
  },
  "admin.fee_rules.create_title": {
    en: "Create Fee Rule",
    hu: "Új díjszabály létrehozása",
    de: "Gebührenregel erstellen",
    es: "Crear regla de tarifa",
    fr: "Créer une règle de frais"
  },
  "admin.fee_rules.modal_subtitle": {
    en: "Define automated surcharge policies, travel distance tiers, or cancellation terms.",
    hu: "Automatikus felárak, utazási távolságsávok vagy lemondási feltételek meghatározása.",
    de: "Definieren Sie automatisierte Aufschläge, Distanzstufen oder Stornobedingungen.",
    es: "Defina políticas de recargo automatizadas, niveles de distancia o términos de cancelación.",
    fr: "Définissez des suppléments automatiques, des tranches de distance ou des conditions d'annulation."
  },
  "admin.fee_rules.field_name": {
    en: "Rule / Policy Name *",
    hu: "Szabály / Szabályzat neve *",
    de: "Regel- / Richtlinienname *",
    es: "Nombre de la regla / política *",
    fr: "Nom de la règle / politique *"
  },
  "admin.fee_rules.field_description": {
    en: "Explanation shown to clients",
    hu: "Ügyfeleknek megjelenített magyarázat",
    de: "Kunden angezeigte Erklärung",
    es: "Explicación mostrada a los clientes",
    fr: "Explication affichée aux clients"
  },
  "admin.fee_rules.fee_type_label": {
    en: "Calculation Type",
    hu: "Számítás típusa",
    de: "Berechnungsart",
    es: "Tipo de cálculo",
    fr: "Type de calcul"
  },
  "admin.fee_rules.create_btn": {
    en: "Save Fee Rule",
    hu: "Díjszabály mentése",
    de: "Gebührenregel speichern",
    es: "Guardar regla de tarifa",
    fr: "Enregistrer la règle de frais"
  },

  // Admin Pricing Page & Modals
  "admin.pricing.untitled": {
    en: "Untitled Listing",
    hu: "Névtelen csomag",
    de: "Unbenanntes Angebot",
    es: "Listado sin título",
    fr: "Offre sans titre"
  },
  "admin.pricing.drag_to_reorder": {
    en: "Drag to reorder",
    hu: "Húzza az átrendezéshez",
    de: "Ziehen zum Neuanordnen",
    es: "Arrastrar para reordenar",
    fr: "Glisser pour réorganiser"
  },
  "admin.pricing.features_count": {
    en: "{count} Features",
    hu: "{count} funkció",
    de: "{count} Funktionen",
    es: "{count} características",
    fr: "{count} fonctionnalités"
  },
  "admin.pricing.action_edit": {
    en: "Edit",
    hu: "Szerkesztés",
    de: "Bearbeiten",
    es: "Editar",
    fr: "Modifier"
  },
  "admin.pricing.action_delete": {
    en: "Delete",
    hu: "Törlés",
    de: "Löschen",
    es: "Eliminar",
    fr: "Supprimer"
  },
  "admin.pricing.bullet_points": {
    en: "bullet points",
    hu: "felsorolási pontok",
    de: "Aufzählungspunkte",
    es: "puntos destacados",
    fr: "puces"
  },
  "admin.pricing.err_load_failed": {
    en: "Failed to load pricing packages.",
    hu: "Nem sikerült betölteni az árcsomagokat.",
    de: "Fehler beim Laden der Preispakete.",
    es: "Error al cargar los paquetes de precios.",
    fr: "Échec du chargement des forfaits."
  },
  "admin.pricing.msg_reorder_success": {
    en: "Pricing listing order updated.",
    hu: "Árcsomagok sorrendje sikeresen frissítve.",
    de: "Reihenfolge der Preispakete aktualisiert.",
    es: "Orden de paquetes actualizado.",
    fr: "Ordre des forfaits mis à jour."
  },
  "admin.pricing.msg_delete_success": {
    en: "Pricing listing deleted successfully.",
    hu: "Árcsomag sikeresen törölve.",
    de: "Preispaket erfolgreich gelöscht.",
    es: "Paquete de precios eliminado con éxito.",
    fr: "Forfait supprimé avec succès."
  },
  "admin.pricing.err_delete_failed": {
    en: "Failed to delete pricing package.",
    hu: "Nem sikerült törölni az árcsomagot.",
    de: "Fehler beim Löschen des Preispakets.",
    es: "Error al eliminar el paquete de precios.",
    fr: "Échec de la suppression du forfait."
  },
  "admin.pricing.stat_tiers": {
    en: "Standard Tiers",
    hu: "Alapcsomagok",
    de: "Standard-Tarife",
    es: "Planes estándar",
    fr: "Forfaits standard"
  },
  "admin.pricing.stat_bundles": {
    en: "Service Bundles",
    hu: "Kombinált csomagok",
    de: "Service-Pakete",
    es: "Paquetes combinados",
    fr: "Packs de services"
  },
  "admin.pricing.stat_active": {
    en: "Active Listings",
    hu: "Aktív ajánlatok",
    de: "Aktive Angebote",
    es: "Listados activos",
    fr: "Offres actives"
  },
  "admin.pricing.btn_refresh": {
    en: "Refresh",
    hu: "Frissítés",
    de: "Aktualisieren",
    es: "Actualizar",
    fr: "Actualiser"
  },
  "admin.pricing.view_grid": {
    en: "Grid View",
    hu: "Rács nézet",
    de: "Rasteransicht",
    es: "Vista de cuadrícula",
    fr: "Vue en grille"
  },
  "admin.pricing.view_list": {
    en: "List View",
    hu: "Lista nézet",
    de: "Listenansicht",
    es: "Vista de lista",
    fr: "Vue en liste"
  },
  "admin.pricing.loading": {
    en: "Loading packages...",
    hu: "Csomagok betöltése...",
    de: "Pakete werden geladen...",
    es: "Cargando paquetes...",
    fr: "Chargement des forfaits..."
  },
  "admin.pricing.empty_search_desc": {
    en: "No packages match your search filter.",
    hu: "Egyetlen csomag sem felel meg a keresési feltételnek.",
    de: "Keine Pakete entsprechen Ihrem Suchfilter.",
    es: "Ningún paquete coincide con su búsqueda.",
    fr: "Aucun forfait ne correspond à votre recherche."
  },
  "admin.pricing.empty_desc": {
    en: "No pricing plans or bundles have been created yet.",
    hu: "Még nem jöttek létre árcsomagok vagy ajánlatok.",
    de: "Es wurden noch keine Preispakete oder Bundles erstellt.",
    es: "Aún no se han creado planes de precios ni paquetes.",
    fr: "Aucun forfait ni pack n'a encore été créé."
  },
  "admin.pricing.delete_modal_title": {
    en: "Delete Pricing Package",
    hu: "Árcsomag törlése",
    de: "Preispaket löschen",
    es: "Eliminar paquete de precios",
    fr: "Supprimer le forfait"
  },
  "admin.pricing.delete_modal_confirm_prefix": {
    en: "Are you sure you want to delete",
    hu: "Biztosan törölni szeretné a következőt:",
    de: "Sind Sie sicher, dass Sie Folgendes löschen möchten:",
    es: "¿Está seguro de que desea eliminar",
    fr: "Êtes-vous sûr de vouloir supprimer"
  },
  "admin.pricing.delete_modal_warning": {
    en: "This will permanently remove this package from all quote builders and the homepage.",
    hu: "Ez véglegesen eltávolítja a csomagot az ajánlatkérőkből és a főoldalról.",
    de: "Dadurch wird dieses Paket dauerhaft von allen Angebotserstellern und der Startseite entfernt.",
    es: "Esto eliminará permanentemente este paquete de todos los generadores de presupuestos y de la página principal.",
    fr: "Cela supprimera définitivement ce forfait de tous les générateurs de devis et de la page d'accueil."
  },
  "admin.pricing.btn_deleting": {
    en: "Deleting...",
    hu: "Törlés...",
    de: "Wird gelöscht...",
    es: "Eliminando...",
    fr: "Suppression..."
  },
  "admin.pricing.field_description": {
    en: "Description / Package Overview",
    hu: "Leírás / Csomag áttekintése",
    de: "Beschreibung / Paketübersicht",
    es: "Descripción / Resumen del paquete",
    fr: "Description / Aperçu du forfait"
  },

  // Admin Social Node
  "admin.social.error_enter_url": {
    en: "Please enter a valid destination URL for this link.",
    hu: "Kérjük, adjon meg egy érvényes cél URL-t a linkhez.",
    de: "Bitte geben Sie eine gültige Ziel-URL für diesen Link ein.",
    es: "Por favor ingrese una URL de destino válida para este enlace.",
    fr: "Veuillez saisir une URL de destination valide pour ce lien."
  },

  // Portfolio Form & SEO Managers
  "admin.portfolio_form.title": {
    en: "Title",
    hu: "Cím",
    de: "Titel",
    es: "Título",
    fr: "Titre"
  },
  "admin.portfolio_form.description": {
    en: "Description",
    hu: "Leírás",
    de: "Beschreibung",
    es: "Descripción",
    fr: "Description"
  },
  "admin.portfolio_form.seo_keywords": {
    en: "SEO Keywords",
    hu: "SEO Kulcsszavak",
    de: "SEO-Schlüsselwörter",
    es: "Palabras clave SEO",
    fr: "Mots-clés SEO"
  },
  "admin.portfolio_form.seo_keywords_desc": {
    en: "Specific keywords for this portfolio item/gallery for search engines.",
    hu: "Egyedi kulcsszavak ehhez a portfólió elemhez a keresőmotorok számára.",
    de: "Spezifische Schlüsselwörter für dieses Portfolio-Element für Suchmaschinen.",
    es: "Palabras clave específicas para este elemento de portafolio para motores de búsqueda.",
    fr: "Mots-clés spécifiques pour cet élément de portfolio pour les moteurs de recherche."
  },
  "admin.portfolio_form.category": {
    en: "Category",
    hu: "Kategória",
    de: "Kategorie",
    es: "Categoría",
    fr: "Catégorie"
  },
  "admin.portfolio_form.settings": {
    en: "Settings",
    hu: "Beállítások",
    de: "Einstellungen",
    es: "Configuraciones",
    fr: "Paramètres"
  },
  "admin.portfolio_form.featured": {
    en: "Featured Portfolio Item",
    hu: "Kiemelt portfólió elem",
    de: "Hervorgehobenes Portfolio-Element",
    es: "Elemento de portafolio destacado",
    fr: "Élément de portfolio mis en avant"
  },
  "admin.portfolio_form.published": {
    en: "Published (Visible to public)",
    hu: "Közzétéve (Nyilvánosan látható)",
    de: "Veröffentlicht (öffentlich sichtbar)",
    es: "Publicado (Visible para el público)",
    fr: "Publié (Visible au public)"
  },
  "admin.portfolio_form.gallery_images": {
    en: "Gallery Images",
    hu: "Galéria képei",
    de: "Galeriebilder",
    es: "Imágenes de la galería",
    fr: "Images de la galerie"
  },
  "admin.portfolio_form.gallery_images_desc": {
    en: "Upload, reorder, and manage metadata for images in this portfolio item.",
    hu: "Képek feltöltése, átrendezése és metaadatainak kezelése a portfólió elemhez.",
    de: "Bilder hochladen, neu anordnen und Metadaten verwalten.",
    es: "Subir, reordenar y administrar metadatos para imágenes en este elemento.",
    fr: "Téléchargez, réorganisez et gérez les métadonnées des images de cet élément."
  },
  "admin.portfolio_form.advanced_json": {
    en: "Advanced: Raw JSON data",
    hu: "Speciális: Nyers JSON adat",
    de: "Erweitert: Unformatierte JSON-Daten",
    es: "Avanzado: Datos JSON sin procesar",
    fr: "Avancé : Données JSON brutes"
  },
  "admin.portfolio_form.cancel": {
    en: "Cancel",
    hu: "Mégse",
    de: "Abbrechen",
    es: "Cancelar",
    fr: "Annuler"
  },
  "admin.portfolio_form.save": {
    en: "Save Project",
    hu: "Projekt mentése",
    de: "Projekt speichern",
    es: "Guardar proyecto",
    fr: "Enregistrer le projet"
  },

  "admin.seo.global_title": {
    en: "Global Site SEO Defaults",
    hu: "Weboldal globális SEO alapértelmezések",
    de: "Globale Website-SEO-Standardwerte",
    es: "Valores predeterminados de SEO global",
    fr: "Paramètres SEO globaux par défaut"
  },
  "admin.seo.global_desc": {
    en: "Default meta tags and global fallback keywords used across the entire website.",
    hu: "Alapértelmezett meta címkék és globális kulcsszavak az egész weboldalon.",
    de: "Standard-Meta-Tags und globale Schlüsselwörter für die gesamte Website.",
    es: "Metaetiquetas predeterminadas y palabras clave globales en todo el sitio web.",
    fr: "Balises méta par défaut et mots-clés globaux sur l'ensemble du site web."
  },
  "admin.seo.default_title": {
    en: "Default Site Title",
    hu: "Alapértelmezett weboldal cím",
    de: "Standard-Seitentitel",
    es: "Título de sitio predeterminado",
    fr: "Titre du site par défaut"
  },
  "admin.seo.default_title_hint": {
    en: "Shown in browser tab and search engine results if page title is omitted.",
    hu: "Megjelenik a böngésző fülén és a keresési találatokban, ha az oldal címe nincs megadva.",
    de: "Wird im Browser-Tab und in den Suchergebnissen angezeigt, wenn der Seitentitel weggelassen wird.",
    es: "Se muestra en la pestaña del navegador y en los resultados de búsqueda si se omite el título.",
    fr: "Affiché dans l'onglet du navigateur et les résultats de recherche si le titre de la page est omis."
  },
  "admin.seo.default_meta_desc": {
    en: "Default Meta Description",
    hu: "Alapértelmezett meta leírás",
    de: "Standard-Meta-Beschreibung",
    es: "Meta descripción predeterminada",
    fr: "Description méta par défaut"
  },
  "admin.seo.default_meta_desc_hint": {
    en: "Recommended length: 150-160 characters for search snippet optimization.",
    hu: "Ajánlott hossz: 150-160 karakter a keresőmotorok számára.",
    de: "Empfohlene Länge: 150-160 Zeichen zur Optimierung des Suchausschnitts.",
    es: "Longitud recomendada: 150-160 caracteres para optimizar fragmentos de búsqueda.",
    fr: "Longueur recommandée : 150-160 caractères pour l'optimisation des extraits de recherche."
  },
  "admin.seo.default_keywords": {
    en: "Global Default Keywords",
    hu: "Globális alapértelmezett kulcsszavak",
    de: "Globale Standard-Schlüsselwörter",
    es: "Palabras clave predeterminadas globales",
    fr: "Mots-clés par défaut globaux"
  },
  "admin.seo.default_keywords_desc": {
    en: "Default keyword tags appended or used when page-specific keywords are not set.",
    hu: "Alapértelmezett kulcsszócímkék, ha az oldal-specifikus kulcsszavak nincsenek beállítva.",
    de: "Standard-Schlüsselwörter, die angehängt oder verwendet werden, wenn keine seitenspezifischen Schlüsselwörter festgelegt sind.",
    es: "Etiquetas de palabras clave predeterminadas utilizadas cuando no se configuran palabras clave específicas.",
    fr: "Balises de mots-clés par défaut utilisées lorsque les mots-clés spécifiques ne sont pas définis."
  },
  "admin.seo.page_specific_title": {
    en: "Page-Specific SEO Meta",
    hu: "Oldal-specifikus SEO metaadatok",
    de: "Seitenspezifische SEO-Metadaten",
    es: "Meta SEO específico de la página",
    fr: "Méta SEO spécifique à la page"
  },
  "admin.seo.page_specific_desc": {
    en: "Override title tags and descriptions for individual site pages.",
    hu: "Címcímkék és leírások felülbírálása az egyes oldalakra.",
    de: "Überschreiben Sie Titel-Tags und Beschreibungen für einzelne Seiten.",
    es: "Anule las etiquetas de título y las descripciones de las páginas individuales.",
    fr: "Remplacez les balises de titre et descriptions pour les pages individuelles."
  },
  "admin.seo.page_title": {
    en: "Page Title Tag",
    hu: "Oldal címcímke (Title tag)",
    de: "Seiten-Titel-Tag",
    es: "Etiqueta de título de página",
    fr: "Balise de titre de la page"
  },
  "admin.seo.page_desc": {
    en: "Page Meta Description",
    hu: "Oldal meta leírás",
    de: "Seiten-Meta-Beschreibung",
    es: "Meta descripción de la página",
    fr: "Description méta de la page"
  },
  "admin.seo.page_keywords": {
    en: "Page Keywords",
    hu: "Oldal kulcsszavak",
    de: "Seiten-Schlüsselwörter",
    es: "Palabras clave de la página",
    fr: "Mots-clés de la page"
  }
};
