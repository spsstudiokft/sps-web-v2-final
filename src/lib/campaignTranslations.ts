type Dictionary = Record<string, string>;

const english: Dictionary = {
  "campaign.tagline": "REAL ESTATE THAT EARNS MORE",
  "campaign.form.heading": "YOUR {reward} DISCOUNT CODE",
  "campaign.form.default_description": "Complete the form and we will send your personal coupon code by email right away.",
  "campaign.form.full_name": "Full name *", "campaign.form.full_name_placeholder": "e.g. Alex Smith",
  "campaign.form.email": "Email address *", "campaign.form.email_placeholder": "you@email.com",
  "campaign.form.phone": "Phone number (optional)", "campaign.form.phone_placeholder": "+36 30 123 4567",
  "campaign.form.city": "City / service area (optional)", "campaign.form.city_placeholder": "e.g. Budapest",
  "campaign.form.identity": "Which best describes you? *", "campaign.form.identity_placeholder": "Choose an option",
  "campaign.form.identity_private": "Private individual", "campaign.form.identity_agent": "Real estate agent", "campaign.form.identity_business": "Business",
  "campaign.form.interest": "What interests you most? *", "campaign.form.interest_placeholder": "Choose an option",
  "campaign.form.interest_photo": "Real estate photography", "campaign.form.interest_video": "Video and drone", "campaign.form.interest_marketing": "Complete marketing", "campaign.form.interest_shop": "Webshop",
  "campaign.form.marketing_consent": "I would like to hear about SPS Studio news and offers.", "campaign.form.privacy_prefix": "I accept the", "campaign.form.privacy_link": "Privacy notice", "campaign.form.submit": "Claim my {reward} discount", "campaign.form.sending": "Sending…", "campaign.form.no_spam": "No spam. Your data is safe with us.",
  "campaign.thank.title": "Thank you!", "campaign.thank.success": "You have successfully claimed your {reward} discount.", "campaign.thank.email_sent": "We also sent the coupon code to your email address.", "campaign.thank.coupon_title": "YOUR PERSONAL COUPON CODE", "campaign.thank.copy_hint": "Click the code to copy it.",
  "campaign.ticket.label": "DISCOUNT",
  "campaign.thank.single_use": "Single use", "campaign.thank.personal": "Personal coupon", "campaign.thank.usable": "Usable on the SPS website and Shopify webshop", "campaign.thank.valid": "Valid for {days} days", "campaign.thank.next_title": "Where would you like to go next?", "campaign.thank.next_description": "Explore our services or browse our digital products.", "campaign.thank.website": "Go to the website", "campaign.thank.website_subtitle": "Services, portfolio, quote request", "campaign.thank.shop": "Go to the webshop", "campaign.thank.shop_subtitle": "Presets, LUTs and digital products", "campaign.thank.check_email": "Check my email", "campaign.thank.coupon_sent": "Coupon code sent", "campaign.thank.questions": "Have questions?", "campaign.thank.contact": "Get in touch with us.", "campaign.thank.follow": "Follow us", "campaign.thank.footer": "MORE THAN IMAGES. GREATER POSSIBILITIES.",
  "campaign.status.loading": "Loading campaign…", "campaign.status.no_claim": "Coupon details appear in this browser after submitting the form.", "campaign.status.back": "Back to the form", "campaign.status.unavailable": "This campaign is unavailable or has ended.",
};

const hungarian: Dictionary = {
  "campaign.tagline": "INGATLANOK, AMIK TÖBBET ÉRNEK",
  "campaign.form.heading": "A {reward}-OS KUPONKÓDODAT",
  "campaign.form.default_description": "Töltsd ki az űrlapot, és azonnal elküldjük neked az egyedi kuponkódodat e-mailben.",
  "campaign.form.full_name": "Teljes név *", "campaign.form.full_name_placeholder": "Pl. Kovács Bence",
  "campaign.form.email": "E-mail cím *", "campaign.form.email_placeholder": "pelda@email.hu",
  "campaign.form.phone": "Telefonszám (opcionális)", "campaign.form.phone_placeholder": "+36 30 123 4567",
  "campaign.form.city": "Város / működési terület (opcionális)", "campaign.form.city_placeholder": "Pl. Budapest",
  "campaign.form.identity": "Te melyik vagy? *", "campaign.form.identity_placeholder": "Válassz egy lehetőséget",
  "campaign.form.identity_private": "Magánszemély", "campaign.form.identity_agent": "Ingatlanos", "campaign.form.identity_business": "Vállalkozás",
  "campaign.form.interest": "Mi érdekel leginkább? *", "campaign.form.interest_placeholder": "Válassz egy lehetőséget",
  "campaign.form.interest_photo": "Ingatlanfotózás", "campaign.form.interest_video": "Videó és drón", "campaign.form.interest_marketing": "Teljes marketing", "campaign.form.interest_shop": "Webshop",
  "campaign.form.marketing_consent": "Szeretnék értesülni az SPS Studio újdonságairól és ajánlatairól.", "campaign.form.privacy_prefix": "Elfogadom az", "campaign.form.privacy_link": "Adatkezelési tájékoztatót", "campaign.form.submit": "Kérem a {reward} kedvezményt", "campaign.form.sending": "Küldés…", "campaign.form.no_spam": "Nincs spam. Az adataid biztonságban vannak.",
  "campaign.thank.title": "Köszönjük!", "campaign.thank.success": "Sikeresen igényelted a {reward} kedvezményedet.", "campaign.thank.email_sent": "A kuponkódot elküldtük a megadott e-mail címedre is.", "campaign.thank.coupon_title": "A TE EGYEDI KUPONKÓDOD", "campaign.thank.copy_hint": "Kattints a kódra a másoláshoz",
  "campaign.ticket.label": "KEDVEZMÉNY",
  "campaign.thank.single_use": "Egyszer használható", "campaign.thank.personal": "Személyhez kötött", "campaign.thank.usable": "Felhasználható az SPS weboldalán és Shopify webshopban is", "campaign.thank.valid": "Érvényes {days} napig", "campaign.thank.next_title": "Hová szeretnél továbbmenni?", "campaign.thank.next_description": "Fedezd fel szolgáltatásainkat vagy nézd meg digitális termékeinket.", "campaign.thank.website": "Irány a weboldal", "campaign.thank.website_subtitle": "Szolgáltatások, portfólió, ajánlatkérés", "campaign.thank.shop": "Irány a webshop", "campaign.thank.shop_subtitle": "Presetek, LUT-ok és digitális termékek", "campaign.thank.check_email": "Ellenőrzöm az e-mailjeimet", "campaign.thank.coupon_sent": "A kuponkód elküldve", "campaign.thank.questions": "Kérdésed van?", "campaign.thank.contact": "Lépj velünk kapcsolatba.", "campaign.thank.follow": "Kövess minket", "campaign.thank.footer": "TÖBB MINT KÉPEK. NAGYOBB LEHETŐSÉGEK.",
  "campaign.status.loading": "Kampány betöltése…", "campaign.status.no_claim": "A kupon részletei ebben a böngészőben a kitöltés után jelennek meg.", "campaign.status.back": "Vissza az űrlaphoz", "campaign.status.unavailable": "Ez a kampány nem érhető el vagy már lezárult.",
};

export const campaignTranslations: Record<string, Dictionary> = { en: english, hu: hungarian };
