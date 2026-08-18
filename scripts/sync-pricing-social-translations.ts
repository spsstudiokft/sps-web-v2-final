import fs from "fs";
import path from "path";
import { setupDatabase } from "../src/db.js";
import { 
  enTranslations, 
  huTranslations, 
  deTranslations, 
  esTranslations, 
  frTranslations 
} from "../src/lib/translations.js";
import { translationService } from "../src/server/services/translationService.js";

// Comprehensive dictionary for Pricing & Social translations across all 5 supported languages
export const pricingAndSocialTranslations: Record<string, { en: string; hu: string; de: string; es: string; fr: string }> = {
  // Navigation
  "admin.nav.pricing": {
    en: "Pricing & Packages",
    hu: "Árak és Csomagok",
    de: "Preise & Pakete",
    es: "Precios y Paquetes",
    fr: "Tarifs & Formules"
  },
  "admin.nav.social_links": {
    en: "Social Popup Tree",
    hu: "Közösségi Média Fa",
    de: "Social-Media-Struktur",
    es: "Árbol de Redes Sociales",
    fr: "Arborescence Réseaux Sociaux"
  },

  // Admin Pricing Page
  "admin.pricing.title": {
    en: "Pricing & Packages",
    hu: "Árak és Csomagok",
    de: "Preise & Pakete",
    es: "Precios y Paquetes",
    fr: "Tarifs & Formules"
  },
  "admin.pricing.description": {
    en: "Manage pricing tiers, service packages, bundled offers, and client rates displayed on the homepage.",
    hu: "Kezelje az árkategóriákat, szolgáltatáscsomagokat, ajánlatokat és árakat a honlapon.",
    de: "Verwalten Sie Preisstufen, Servicepakete, Bundle-Angebote und Kundentarife auf der Startseite.",
    es: "Gestione tarifas, paquetes de servicios, ofertas agrupadas y precios mostrados en la página principal.",
    fr: "Gérez les niveaux de tarification, formules de services, offres groupées et tarifs clients affichés sur le site."
  },
  "admin.pricing.btn_add_bundle": {
    en: "Add Bundle",
    hu: "Csomag Hozzáadása",
    de: "Bundle hinzufügen",
    es: "Añadir Paquete",
    fr: "Ajouter une Formule"
  },
  "admin.pricing.btn_add_plan": {
    en: "Add Pricing Plan",
    hu: "Árcsomag Hozzáadása",
    de: "Tarifplan hinzufügen",
    es: "Añadir Plan de Precios",
    fr: "Ajouter un Tarif"
  },
  "admin.pricing.stat_total": {
    en: "Total Packages",
    hu: "Összes Csomag",
    de: "Gesamtpakete",
    es: "Paquetes Totales",
    fr: "Total des Formules"
  },
  "admin.pricing.stat_standard_tiers": {
    en: "Standard Tiers",
    hu: "Standard Csomagok",
    de: "Standardtarife",
    es: "Planes Estándar",
    fr: "Tarifs Standards"
  },
  "admin.pricing.stat_service_bundles": {
    en: "Service Bundles",
    hu: "Szolgáltatás Csomagok",
    de: "Service-Bundles",
    es: "Paquetes Combinados",
    fr: "Formules Groupées"
  },
  "admin.pricing.stat_active_on_site": {
    en: "Active on Site",
    hu: "Aktív az Oldalon",
    de: "Aktiv auf der Website",
    es: "Activo en el Sitio",
    fr: "Actif sur le Site"
  },
  "admin.pricing.search_placeholder": {
    en: "Search plans, features, bundles...",
    hu: "Keresés csomagok, funkciók, szolgáltatások között...",
    de: "Pläne, Funktionen, Bundles suchen...",
    es: "Buscar planes, características, paquetes...",
    fr: "Rechercher des formules, options, packages..."
  },
  "admin.pricing.filter_all_types": {
    en: "All Types",
    hu: "Minden Típus",
    de: "Alle Typen",
    es: "Todos los Tipos",
    fr: "Tous les Types"
  },
  "admin.pricing.filter_standard_plans": {
    en: "Standard Plans ({count})",
    hu: "Standard Csomagok ({count})",
    de: "Standardpläne ({count})",
    es: "Planes Estándar ({count})",
    fr: "Formules Standards ({count})"
  },
  "admin.pricing.filter_bundles": {
    en: "Bundles ({count})",
    hu: "Kombinált Csomagok ({count})",
    de: "Bundles ({count})",
    es: "Paquetes Combinados ({count})",
    fr: "Formules Groupées ({count})"
  },
  "admin.pricing.filter_all_statuses": {
    en: "All Statuses",
    hu: "Minden Állapot",
    de: "Alle Status",
    es: "Todos los Estados",
    fr: "Tous les Statuts"
  },
  "admin.pricing.filter_enabled_only": {
    en: "Enabled Only ({count})",
    hu: "Csak Engedélyezettek ({count})",
    de: "Nur Aktivierte ({count})",
    es: "Solo Habilitados ({count})",
    fr: "Uniquement Activés ({count})"
  },
  "admin.pricing.filter_disabled_only": {
    en: "Disabled Only ({count})",
    hu: "Csak Letiltottak ({count})",
    de: "Nur Deaktivierte ({count})",
    es: "Solo Deshabilitados ({count})",
    fr: "Uniquement Désactivés ({count})"
  },
  "admin.pricing.refresh": {
    en: "Refresh",
    hu: "Frissítés",
    de: "Aktualisieren",
    es: "Actualizar",
    fr: "Actualiser"
  },
  "admin.pricing.grid_view": {
    en: "Grid view",
    hu: "Rács nézet",
    de: "Rasteransicht",
    es: "Vista de cuadrícula",
    fr: "Vue en grille"
  },
  "admin.pricing.list_view": {
    en: "List view",
    hu: "Lista nézet",
    de: "Listenansicht",
    es: "Vista de lista",
    fr: "Vue en liste"
  },
  "admin.pricing.drag_reorder": {
    en: "Drag to reorder",
    hu: "Húzza az átrendezéshez",
    de: "Ziehen zum Neuanordnen",
    es: "Arrastrar para reordenar",
    fr: "Glisser pour réorganiser"
  },
  "admin.pricing.tag_bundle": {
    en: "Bundle",
    hu: "Csomag",
    de: "Bundle",
    es: "Paquete",
    fr: "Formule"
  },
  "admin.pricing.tag_tier": {
    en: "Tier Plan",
    hu: "Alapcsomag",
    de: "Tarifplan",
    es: "Plan Individual",
    fr: "Offre Individuelle"
  },
  "admin.pricing.badge_featured": {
    en: "Featured",
    hu: "Kiemelt",
    de: "Hervorgehoben",
    es: "Destacado",
    fr: "En Vedette"
  },
  "admin.pricing.move_up": {
    en: "Move Up",
    hu: "Mozgatás Fel",
    de: "Nach oben verschieben",
    es: "Mover Arriba",
    fr: "Déplacer vers le Haut"
  },
  "admin.pricing.move_down": {
    en: "Move Down",
    hu: "Mozgatás Le",
    de: "Nach unten verschieben",
    es: "Mover Abajo",
    fr: "Déplacer vers le Bas"
  },
  "admin.pricing.label_includes": {
    en: "Includes:",
    hu: "Tartalmazza:",
    de: "Enthält:",
    es: "Incluye:",
    fr: "Inclus :"
  },
  "admin.pricing.label_features": {
    en: "Features ({count})",
    hu: "Funkciók ({count})",
    de: "Funktionen ({count})",
    es: "Características ({count})",
    fr: "Options ({count})"
  },
  "admin.pricing.more_features": {
    en: "+{count} more features...",
    hu: "+{count} további funkció...",
    de: "+{count} weitere Funktionen...",
    es: "+{count} características más...",
    fr: "+{count} options supplémentaires..."
  },
  "admin.pricing.status_enabled": {
    en: "Enabled",
    hu: "Bekapcsolva",
    de: "Aktiviert",
    es: "Habilitado",
    fr: "Activé"
  },
  "admin.pricing.status_disabled": {
    en: "Disabled",
    hu: "Kikapcsolva",
    de: "Deaktiviert",
    es: "Deshabilitado",
    fr: "Désactivé"
  },
  "admin.pricing.tooltip_enabled": {
    en: "Visible on frontend (Click to disable)",
    hu: "Látható az oldalon (Kattintson a kikapcsoláshoz)",
    de: "Auf der Website sichtbar (Klicken zum Deaktivieren)",
    es: "Visible en el sitio web (Haga clic para deshabilitar)",
    fr: "Visible sur le site (Cliquer pour désactiver)"
  },
  "admin.pricing.tooltip_disabled": {
    en: "Disabled on frontend (Click to enable)",
    hu: "Rejtett az oldalon (Kattintson a bekapcsoláshoz)",
    de: "Auf der Website ausgeblendet (Klicken zum Aktivieren)",
    es: "Oculto en el sitio web (Haga clic para habilitar)",
    fr: "Masqué sur le site (Cliquer pour activer)"
  },
  "admin.pricing.mark_featured": {
    en: "Mark as featured",
    hu: "Megjelölés kiemeltként",
    de: "Als hervorgehoben markieren",
    es: "Marcar como destacado",
    fr: "Mettre en vedette"
  },
  "admin.pricing.unmark_featured": {
    en: "Unmark as featured",
    hu: "Kiemelés eltávolítása",
    de: "Hervorhebung aufheben",
    es: "Desmarcar destacado",
    fr: "Retirer de la vedette"
  },
  "admin.pricing.edit_plan": {
    en: "Edit Plan",
    hu: "Csomag Szerkesztése",
    de: "Tarif bearbeiten",
    es: "Editar Plan",
    fr: "Modifier la Formule"
  },
  "admin.pricing.delete_plan": {
    en: "Delete Plan",
    hu: "Csomag Törlése",
    de: "Tarif löschen",
    es: "Eliminar Plan",
    fr: "Supprimer la Formule"
  },
  "admin.pricing.th_order": {
    en: "Order",
    hu: "Sorrend",
    de: "Reihenfolge",
    es: "Orden",
    fr: "Ordre"
  },
  "admin.pricing.th_plan": {
    en: "Plan / Bundle",
    hu: "Csomag / Ajánlat",
    de: "Tarif / Paket",
    es: "Plan / Paquete",
    fr: "Formule / Offre"
  },
  "admin.pricing.th_price": {
    en: "Price",
    hu: "Ár",
    de: "Preis",
    es: "Precio",
    fr: "Tarif"
  },
  "admin.pricing.th_features": {
    en: "Features",
    hu: "Funkciók",
    de: "Funktionen",
    es: "Características",
    fr: "Options"
  },
  "admin.pricing.th_visibility": {
    en: "Visibility",
    hu: "Láthatóság",
    de: "Sichtbarkeit",
    es: "Visibilidad",
    fr: "Visibilité"
  },
  "admin.pricing.th_actions": {
    en: "Actions",
    hu: "Műveletek",
    de: "Aktionen",
    es: "Acciones",
    fr: "Actions"
  },
  "admin.pricing.empty_title": {
    en: "No Pricing Packages Found",
    hu: "Nem találhatók árcsomagok",
    de: "Keine Preispakete gefunden",
    es: "No se encontraron paquetes de precios",
    fr: "Aucun tarif trouvé"
  },
  "admin.pricing.empty_filtered": {
    en: "No packages match your search filters. Try adjusting your search query.",
    hu: "Nem található a keresési feltételeknek megfelelő csomag. Próbálja módosítani a keresést.",
    de: "Keine Pakete entsprechen Ihren Suchfiltern. Bitte passen Sie Ihre Suchanfrage an.",
    es: "Ningún paquete coincide con sus filtros de búsqueda. Intente ajustar su consulta.",
    fr: "Aucune formule ne correspond à vos filtres. Essayez d'ajuster votre recherche."
  },
  "admin.pricing.empty_unfiltered": {
    en: "Get started by adding your first pricing tier or service bundle to showcase your offers.",
    hu: "Hozza létre első árcsomagját vagy szolgáltatáscsomagját ajánlatai bemutatásához.",
    de: "Beginnen Sie mit dem Erstellen Ihres ersten Tarifplans oder Servicepakets.",
    es: "Comience agregando su primer plan de precios o paquete de servicios para mostrar sus ofertas.",
    fr: "Commencez par ajouter votre premier tarif ou formule groupée pour présenter vos offres."
  },
  "admin.pricing.btn_create_first": {
    en: "Create First Plan",
    hu: "Első Csomag Létrehozása",
    de: "Ersten Plan erstellen",
    es: "Crear Primer Plan",
    fr: "Créer le Premier Tarif"
  },
  "admin.pricing.delete_confirm_title": {
    en: "Delete Pricing Package?",
    hu: "Árcsomag törlése?",
    de: "Preispaket löschen?",
    es: "¿Eliminar Paquete de Precios?",
    fr: "Supprimer la Formule ?"
  },
  "admin.pricing.delete_confirm_body": {
    en: "Are you sure you want to delete \"{name}\"? This action cannot be undone. If you just want to temporarily hide it, you can disable it instead.",
    hu: "Biztosan törli a(z) \"{name}\" csomagot? Ez a művelet nem vonható vissza. Ha csak átmenetileg szeretné elrejteni, tiltsa le helyette.",
    de: "Möchten Sie das Paket \"{name}\" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden. Wenn Sie es nur vorübergehend ausblenden möchten, deaktivieren Sie es stattdessen.",
    es: "¿Está seguro de que desea eliminar \"{name}\"? Esta acción no se puede deshacer. Si solo desea ocultarlo temporalmente, puede deshabilitarlo.",
    fr: "Êtes-vous sûr de vouloir supprimer \"{name}\" ? Cette action est irréversible. Si vous souhaitez simplement le masquer temporairement, vous pouvez le désactiver."
  },
  "admin.pricing.btn_delete_confirm": {
    en: "Delete Package",
    hu: "Csomag Törlése",
    de: "Paket löschen",
    es: "Eliminar Paquete",
    fr: "Supprimer le Paquet"
  },
  "admin.pricing.deleting": {
    en: "Deleting...",
    hu: "Törlés...",
    de: "Wird gelöscht...",
    es: "Eliminando...",
    fr: "Suppression..."
  },
  "admin.pricing.toast_order_updated": {
    en: "Pricing order updated successfully.",
    hu: "Árcsomagok sorrendje sikeresen frissítve.",
    de: "Reihenfolge der Preispakete erfolgreich aktualisiert.",
    es: "Orden de los paquetes actualizado con éxito.",
    fr: "Ordre des tarifs mis à jour avec succès."
  },
  "admin.pricing.toast_order_failed": {
    en: "Failed to save reorder changes.",
    hu: "A sorrend mentése sikertelen.",
    de: "Speichern der Reihenfolge fehlgeschlagen.",
    es: "Error al guardar los cambios de orden.",
    fr: "Échec de l'enregistrement du nouvel ordre."
  },
  "admin.pricing.toast_enabled": {
    en: "Plan enabled and visible on site.",
    hu: "Csomag bekapcsolva és látható a weboldalon.",
    de: "Tarifplan aktiviert und auf der Website sichtbar.",
    es: "Plan habilitado y visible en el sitio.",
    fr: "Formule activée et visible sur le site."
  },
  "admin.pricing.toast_disabled": {
    en: "Plan disabled.",
    hu: "Csomag kikapcsolva.",
    de: "Tarifplan deaktiviert.",
    es: "Plan deshabilitado.",
    fr: "Formule désactivée."
  },
  "admin.pricing.toast_featured_on": {
    en: "Marked as featured listing.",
    hu: "Megjelölve kiemelt csomagként.",
    de: "Als hervorgehobenes Angebot markiert.",
    es: "Marcado como oferta destacada.",
    fr: "Marqué comme offre en vedette."
  },
  "admin.pricing.toast_featured_off": {
    en: "Unmarked as featured.",
    hu: "Kiemelés eltávolítva.",
    de: "Hervorhebung entfernt.",
    es: "Destacado eliminado.",
    fr: "Retiré des offres en vedette."
  },
  "admin.pricing.toast_updated": {
    en: "Pricing package updated successfully.",
    hu: "Árcsomag sikeresen frissítve.",
    de: "Preispaket erfolgreich aktualisiert.",
    es: "Paquete de precios actualizado con éxito.",
    fr: "Tarif mis à jour avec succès."
  },
  "admin.pricing.toast_created": {
    en: "Pricing package created successfully.",
    hu: "Árcsomag sikeresen létrehozva.",
    de: "Preispaket erfolgreich erstellt.",
    es: "Paquete de precios creado con éxito.",
    fr: "Tarif créé avec succès."
  },
  "admin.pricing.toast_deleted": {
    en: "Pricing package deleted.",
    hu: "Árcsomag törölve.",
    de: "Preispaket gelöscht.",
    es: "Paquete de precios eliminado.",
    fr: "Tarif supprimé."
  },
  "admin.pricing.toast_load_failed": {
    en: "Failed to load pricing packages.",
    hu: "Nem sikerült betölteni az árcsomagokat.",
    de: "Preispakete konnten nicht geladen werden.",
    es: "Error al cargar los paquetes de precios.",
    fr: "Échec du chargement des tarifs."
  },

  // Pricing Modal
  "admin.pricing.modal_title_edit": {
    en: "Edit Pricing Listing",
    hu: "Árcsomag Szerkesztése",
    de: "Preiseintrag bearbeiten",
    es: "Editar Entrada de Precios",
    fr: "Modifier l'Offre Tarifaire"
  },
  "admin.pricing.modal_title_create": {
    en: "Create Pricing Plan or Bundle",
    hu: "Új Árcsomag vagy Ajánlat Létrehozása",
    de: "Tarifplan oder Bundle erstellen",
    es: "Crear Plan de Precios o Paquete",
    fr: "Créer un Tarif ou une Formule"
  },
  "admin.pricing.modal_subtitle": {
    en: "Configure rates, packages, service bundles, and bullet features.",
    hu: "Állítsa be az árakat, csomagokat, szolgáltatásokat és felsorolásokat.",
    de: "Konfigurieren Sie Tarife, Pakete, Service-Bundles und Funktionen.",
    es: "Configure tarifas, paquetes, combinaciones de servicios y características.",
    fr: "Configurez les tarifs, packages, formules de services et options incluses."
  },
  "admin.pricing.tab_form": {
    en: "Form",
    hu: "Űrlap",
    de: "Formular",
    es: "Formulario",
    fr: "Formulaire"
  },
  "admin.pricing.tab_preview": {
    en: "Preview",
    hu: "Előnézet",
    de: "Vorschau",
    es: "Vista previa",
    fr: "Aperçu"
  },
  "admin.pricing.preview_heading": {
    en: "Card Live Preview",
    hu: "Kártya Élő Előnézete",
    de: "Live-Karten-Vorschau",
    es: "Vista Previa en Vivo",
    fr: "Aperçu en Direct"
  },
  "admin.pricing.type_standard": {
    en: "Standard Plan / Tier",
    hu: "Standard Csomag / Kategória",
    de: "Standardplan / Tarifstufe",
    es: "Plan Estándar / Nivel",
    fr: "Offre Standard / Formule"
  },
  "admin.pricing.type_bundle": {
    en: "Service Bundle / Package",
    hu: "Szolgáltatáscsomag / Kombinált",
    de: "Service-Bundle / Kombipaket",
    es: "Paquete de Servicios / Combinado",
    fr: "Pack de Services / Groupé"
  },
  "admin.pricing.field_title": {
    en: "Plan / Bundle Title *",
    hu: "Csomag / Ajánlat Neve *",
    de: "Tarif- / Paketname *",
    es: "Título del Plan / Paquete *",
    fr: "Nom du Tarif / de la Formule *"
  },
  "admin.pricing.field_subtitle": {
    en: "Subtitle / Short Description",
    hu: "Alcím / Rövid Leírás",
    de: "Untertitel / Kurzbeschreibung",
    es: "Subtítulo / Breve Descripción",
    fr: "Sous-titre / Brève Description"
  },
  "admin.pricing.field_price": {
    en: "Price *",
    hu: "Ár *",
    de: "Preis *",
    es: "Precio *",
    fr: "Tarif *"
  },
  "admin.pricing.field_currency": {
    en: "Currency",
    hu: "Pénznem",
    de: "Währung",
    es: "Moneda",
    fr: "Devise"
  },
  "admin.pricing.field_billing_period": {
    en: "Billing Period / Scope",
    hu: "Elszámolási Időszak / Egység",
    de: "Abrechnungszeitraum / Einheit",
    es: "Período / Unidad de Facturación",
    fr: "Période / Unité de Facturation"
  },
  "admin.pricing.field_billing_period_ph": {
    en: "e.g. project, property, month",
    hu: "pl. projekt, ingatlan, hónap",
    de: "z. B. Projekt, Immobilie, Monat",
    es: "ej. proyecto, propiedad, mes",
    fr: "ex. projet, bien immobilier, mois"
  },
  "admin.pricing.field_original_price": {
    en: "Original Price (Before Discount)",
    hu: "Eredeti Ár (Kedvezmény Előtt)",
    de: "Originalpreis (vor Rabatt)",
    es: "Precio Original (Antes del Descuento)",
    fr: "Prix d'Origine (Avant Réduction)"
  },
  "admin.pricing.optional": {
    en: "(Optional)",
    hu: "(Opcionális)",
    de: "(Optional)",
    es: "(Opcional)",
    fr: "(Facultatif)"
  },
  "admin.pricing.field_original_price_ph": {
    en: "e.g. 399 (shown strike-through)",
    hu: "pl. 399 (áthúzva jelenik meg)",
    de: "z. B. 399 (durchgestrichen dargestellt)",
    es: "ej. 399 (tachado)",
    fr: "ex. 399 (affiché barré)"
  },
  "admin.pricing.field_discount_label": {
    en: "Discount / Savings Badge",
    hu: "Kedvezmény / Megtakarítás Címke",
    de: "Rabatt- / Spar-Badge",
    es: "Insignia de Descuento / Ahorro",
    fr: "Badge de Réduction / Économie"
  },
  "admin.pricing.field_discount_label_ph": {
    en: "e.g. Save $100 (25% OFF)",
    hu: "pl. 30 000 Ft Megtakarítás (25% KEDVEZMÉNY)",
    de: "z. B. 100 € sparen (25% Rabatt)",
    es: "ej. Ahorra $100 (25% DTO)",
    fr: "ex. Économisez 100 € (-25%)"
  },
  "admin.pricing.field_included_services": {
    en: "Included Services / Bundle Components",
    hu: "Tartalmazott Szolgáltatások / Összetevők",
    de: "Enthaltene Leistungen / Bundle-Komponenten",
    es: "Servicios Incluidos / Componentes del Paquete",
    fr: "Services Inclus / Composants de la Formule"
  },
  "admin.pricing.field_included_services_ph": {
    en: "e.g. HDR Photography, Aerial Drone, Floor Plans...",
    hu: "pl. HDR Fotózás, Drónfelvételek, Alaprajzok...",
    de: "z. B. HDR-Fotografie, Drohnenaufnahmen, Grundrisse...",
    es: "ej. Fotografía HDR, Dron Aéreo, Planos de Planta...",
    fr: "ex. Photographie HDR, Drone Aérien, Plans 2D/3D..."
  },
  "admin.pricing.btn_add": {
    en: "Add",
    hu: "Hozzáadás",
    de: "Hinzufügen",
    es: "Añadir",
    fr: "Ajouter"
  },
  "admin.pricing.field_features": {
    en: "Features List (Bullet Points) *",
    hu: "Funkciók Listája (Felsorolási Pontok) *",
    de: "Leistungsmerkmale (Aufzählungspunkte) *" || "Funktionen",
    es: "Lista de Características (Puntos Clave) *",
    fr: "Liste des Caractéristiques (Points Clés) *"
  },
  "admin.pricing.field_features_ph": {
    en: "e.g. Up to 35 HDR Photos, 24-Hour Turnaround...",
    hu: "pl. Akár 35 HDR fotó, 24 órás átadás...",
    de: "z. B. Bis zu 35 HDR-Fotos, 24-Stunden-Lieferung...",
    es: "ej. Hasta 35 Fotos HDR, Entrega en 24 horas...",
    fr: "ex. Jusqu'à 35 Photos HDR, Livraison en 24h..."
  },
  "admin.pricing.features_empty": {
    en: "No features added yet. Add bullet points highlighting what clients get.",
    hu: "Még nincsenek funkciók hozzáadva. Adjon meg pontokat, amik bemutatják mit kap az ügyfél.",
    de: "Noch keine Merkmale hinzugefügt. Fügen Sie Punkte hinzu, die den Mehrwert verdeutlichen.",
    es: "Aún no se han añadido características. Agregue puntos que resalten lo que reciben los clientes.",
    fr: "Aucune option ajoutée pour l'instant. Ajoutez des points mettant en valeur vos prestations."
  },
  "admin.pricing.field_cta_label": {
    en: "Button / CTA Label",
    hu: "Gomb / Cselekvésre Felhívás Szövege",
    de: "Button / CTA-Beschriftung",
    es: "Etiqueta del Botón / CTA",
    fr: "Libellé du Bouton / Appel à l'action"
  },
  "admin.pricing.field_cta_label_ph": {
    en: "e.g. Book Now, Get Started, Contact Us",
    hu: "pl. Időpontfoglalás, Megrendelés, Kapcsolat",
    de: "z. B. Jetzt buchen, Loslegen, Kontaktieren",
    es: "ej. Reservar Ahora, Empezar, Contactar",
    fr: "ex. Réserver, Commencer, Nous Contacter"
  },
  "admin.pricing.field_cta_url": {
    en: "Button Action Link / Section",
    hu: "Gomb Hivatkozás / Célpont",
    de: "Button-Aktionslink / Zielbereich",
    es: "Enlace de Acción / Sección del Botón",
    fr: "Lien d'Action / Section Cible du Bouton"
  },
  "admin.pricing.field_cta_url_ph": {
    en: "e.g. #contact or /client/signup",
    hu: "pl. #contact vagy /client/signup",
    de: "z. B. #contact oder /client/signup",
    es: "ej. #contact o /client/signup",
    fr: "ex. #contact ou /client/signup"
  },
  "admin.pricing.field_is_featured": {
    en: "Featured / Recommended Plan",
    hu: "Kiemelt / Ajánlott Csomag",
    de: "Hervorgehobener / Empfohlener Tarif",
    es: "Plan Destacado / Recomendado",
    fr: "Formule en Vedette / Recommandée"
  },
  "admin.pricing.field_is_featured_desc": {
    en: "Highlights this card with a prominent border, scale elevation, and badge.",
    hu: "Kiemeli a kártyát hangsúlyos kerettel, enyhe kiemeléssel és jelvénnyel.",
    de: "Hebt diese Karte mit einem auffälligen Rahmen, Erhebung und Badge hervor.",
    es: "Destaca esta tarjeta con un borde prominente, elevación y una insignia distintiva.",
    fr: "Met en valeur cette carte avec une bordure visible, une élévation et un badge."
  },
  "admin.pricing.field_featured_badge": {
    en: "Featured Badge Label",
    hu: "Kiemelt Jelvény Szövege",
    de: "Badge-Text für Empfehlung",
    es: "Texto de Insignia Destacada",
    fr: "Texte du Badge Vedette"
  },
  "admin.pricing.field_featured_badge_ph": {
    en: "e.g. Most Popular, Best Value, Recommended",
    hu: "pl. Legnépszerűbb, Legjobb Érték, Ajánlott",
    de: "z. B. Am beliebtesten, Bestes Angebot, Empfohlen",
    es: "ej. Más Popular, Mejor Valor, Recomendado",
    fr: "ex. Le Plus Populaire, Meilleur Rapport Qualité/Prix, Recommandé"
  },
  "admin.pricing.field_is_enabled": {
    en: "Enabled on Website",
    hu: "Bekapcsolva a Weboldalon",
    de: "Auf der Website aktiviert",
    es: "Habilitado en el Sitio Web",
    fr: "Activé sur le Site Web"
  },
  "admin.pricing.field_is_enabled_desc": {
    en: "Toggle whether this listing is visible to visitors on the frontend.",
    hu: "Beállíthatja, hogy az ajánlat megjelenjen-e a látogatóknak a weboldalon.",
    de: "Legen Sie fest, ob dieses Angebot für Website-Besucher sichtbar ist.",
    es: "Controle si esta oferta es visible para los visitantes en el frontend.",
    fr: "Déterminez si cette offre est visible par les visiteurs sur le site."
  },
  "admin.pricing.btn_create_submit": {
    en: "Create Listing",
    hu: "Csomag Létrehozása",
    de: "Angebot erstellen",
    es: "Crear Oferta",
    fr: "Créer l'Offre"
  },
  "admin.pricing.btn_update_submit": {
    en: "Update Listing",
    hu: "Csomag Frissítése",
    de: "Angebot aktualisieren",
    es: "Actualizar Oferta",
    fr: "Mettre à Jour l'Offre"
  },
  "admin.pricing.btn_saving": {
    en: "Saving...",
    hu: "Mentés...",
    de: "Speichern...",
    es: "Guardando...",
    fr: "Enregistrement..."
  },
  "admin.pricing.err_title_required": {
    en: "Plan / Bundle title is required.",
    hu: "A csomag / ajánlat neve kötelező.",
    de: "Titel des Tarifplans oder Bundles ist erforderlich.",
    es: "El título del plan o paquete es obligatorio.",
    fr: "Le nom du tarif ou de la formule est obligatoire."
  },
  "admin.pricing.err_save_failed": {
    en: "Failed to save pricing package.",
    hu: "Nem sikerült elmenteni az árcsomagot.",
    de: "Preispaket konnte nicht gespeichert werden.",
    es: "Error al guardar el paquete de precios.",
    fr: "Échec de l'enregistrement de l'offre tarifaire."
  },

  // Public Pricing
  "public.pricing.tagline": {
    en: "Transparent Investment",
    hu: "Átlátható Befektetés",
    de: "Transparente Investition",
    es: "Inversión Transparente",
    fr: "Investissement Transparent"
  },
  "public.pricing.title": {
    en: "Pricing & Packages",
    hu: "Árak és Csomagok",
    de: "Preise & Pakete",
    es: "Precios y Paquetes",
    fr: "Tarifs & Formules"
  },
  "public.pricing.subtitle": {
    en: "Flexible photography, video, and multimedia packages designed to elevate your property listings.",
    hu: "Rugalmas fotózási, videós és multimédiás csomagok ingatlanjai prémium bemutatásához.",
    de: "Flexible Foto-, Video- und Multimediapakete zur perfekten Präsentation Ihrer Immobilien.",
    es: "Paquetes flexibles de fotografía, vídeo y multimedia diseñados para elevar sus propiedades.",
    fr: "Des formules flexibles de photographie, vidéo et multimédia conçues pour valoriser vos biens immobiliers."
  },
  "public.pricing.tab_all": {
    en: "All Offers",
    hu: "Minden Ajánlat",
    de: "Alle Angebote",
    es: "Todas las Ofertas",
    fr: "Toutes les Offres"
  },
  "public.pricing.tab_plans": {
    en: "Individual Plans",
    hu: "Egyedi Csomagok",
    de: "Einzeltarife",
    es: "Planes Individuales",
    fr: "Offres Individuelles"
  },
  "public.pricing.tab_bundles": {
    en: "Value Bundles",
    hu: "Kombinált Csomagok",
    de: "Spar-Bundles",
    es: "Paquetes Combinados",
    fr: "Formules Groupées"
  },
  "public.pricing.included_services": {
    en: "Included Services:",
    hu: "Tartalmazott Szolgáltatások:",
    de: "Enthaltene Leistungen:",
    es: "Servicios Incluidos:",
    fr: "Services Inclus :"
  },
  "public.pricing.cta_default": {
    en: "Get Started",
    hu: "Megrendelés",
    de: "Jetzt starten",
    es: "Empezar",
    fr: "Démarrer"
  },
  "public.pricing.badge_bundle": {
    en: "Bundle",
    hu: "Csomag",
    de: "Bundle",
    es: "Paquete",
    fr: "Formule"
  },
  "public.pricing.badge_featured": {
    en: "Most Popular",
    hu: "Legnépszerűbb",
    de: "Am beliebtesten",
    es: "Más Popular",
    fr: "Le Plus Populaire"
  },

  // Social Links in Admin
  "admin.social.stats_total": {
    en: "Total Tree Nodes",
    hu: "Összes Fa Elem",
    de: "Gesamte Baumelemente",
    es: "Nodos Totales del Árbol",
    fr: "Nœuds Totaux de l'Arbre"
  },
  "admin.social.stats_groups": {
    en: "Link Groups",
    hu: "Link Csoportok",
    de: "Link-Gruppen",
    es: "Grupos de Enlaces",
    fr: "Groupes de Liens"
  },
  "admin.social.stats_links": {
    en: "Direct Links",
    hu: "Közvetlen Linkek",
    de: "Direkte Links",
    es: "Enlaces Directos",
    fr: "Liens Directs"
  },
  "admin.social.stats_active": {
    en: "Active & Visible",
    hu: "Aktív és Látható",
    de: "Aktiv & Sichtbar",
    es: "Activo y Visible",
    fr: "Actif & Visible"
  },
  "admin.social.btn_reset_defaults": {
    en: "Reset Defaults",
    hu: "Alapértelmezések Visszaállítása",
    de: "Standardwerte zurücksetzen",
    es: "Restablecer Valores Predeterminados",
    fr: "Réinitialiser"
  },
  "admin.social.reset_confirm": {
    en: "Are you sure you want to reset the social links tree to default presets? All current links and groups will be replaced.",
    hu: "Biztosan visszaállítja a közösségi média fa struktúrát az alapértelmezett beállításokra? Minden jelenlegi link és csoport felülíródik.",
    de: "Möchten Sie die Social-Media-Struktur wirklich auf die Standardwerte zurücksetzen? Alle aktuellen Links und Gruppen werden ersetzt.",
    es: "¿Está seguro de que desea restablecer el árbol de enlaces sociales a los valores predeterminados? Se reemplazarán todos los enlaces y grupos actuales.",
    fr: "Êtes-vous sûr de vouloir réinitialiser l'arborescence des réseaux sociaux aux paramètres par défaut ? Tous les liens et groupes actuels seront remplacés."
  },
  "admin.social.reset_success": {
    en: "Reset to default social tree successfully!",
    hu: "Alapértelmezett közösségi fa sikeresen visszaállítva!",
    de: "Standard-Social-Struktur erfolgreich wiederhergestellt!",
    es: "¡Árbol social predeterminado restablecido con éxito!",
    fr: "Arborescence sociale par défaut réinitialisée avec succès !"
  },
  "admin.social.reset_failed": {
    en: "Failed to reset defaults",
    hu: "Nem sikerült visszaállítani az alapértelmezéseket",
    de: "Standardwerte konnten nicht wiederhergestellt werden",
    es: "Error al restablecer los valores predeterminados",
    fr: "Échec de la réinitialisation des paramètres par défaut"
  },
  "admin.social.view_tree": {
    en: "Tree View",
    hu: "Fa Nézet",
    de: "Baumansicht",
    es: "Vista de Árbol",
    fr: "Vue en Arbre"
  },
  "admin.social.view_flat": {
    en: "Flat List",
    hu: "Egyszerű Lista",
    de: "Flache Liste",
    es: "Lista Plana",
    fr: "Liste Plate"
  },
  "admin.social.expand_all": {
    en: "Expand All",
    hu: "Összes Kinyitása",
    de: "Alle ausklappen",
    es: "Expandir Todo",
    fr: "Tout Développer"
  },
  "admin.social.collapse_all": {
    en: "Collapse All",
    hu: "Összes Becsukása",
    de: "Alle einklappen",
    es: "Contraer Todo",
    fr: "Tout Réduire"
  },
  "admin.social.empty_title": {
    en: "No Social Links Configured",
    hu: "Nincsenek Közösségi Linkek Beállítva",
    de: "Keine Social-Links konfiguriert",
    es: "No Hay Enlaces Sociales Configurados",
    fr: "Aucun Lien Social Configuré"
  },
  "admin.social.empty_desc": {
    en: "Get started by loading our pre-built real estate social media tree or create custom groups and links.",
    hu: "Kezdje a stúdió előre összeállított közösségi fa betöltésével, vagy hozzon létre egyedi csoportokat és linkeket.",
    de: "Beginnen Sie mit unserer vorkonfigurierten Social-Media-Struktur oder erstellen Sie benutzerdefinierte Gruppen und Links.",
    es: "Comience cargando nuestro árbol preconfigurado de redes sociales inmobiliarias o cree grupos y enlaces personalizados.",
    fr: "Commencez par charger notre arborescence préconfigurée de réseaux sociaux ou créez des groupes et liens personnalisés."
  },
  "admin.social.btn_load_defaults": {
    en: "Load Default Studio Social Tree",
    hu: "Alapértelmezett Közösségi Fa Betöltése",
    de: "Standard-Studio-Baum laden",
    es: "Cargar Árbol Social Predeterminado",
    fr: "Charger l'Arborescence Sociale par Défaut"
  },
  "admin.social.btn_create_empty_group": {
    en: "Create Empty Group",
    hu: "Üres Csoport Létrehozása",
    de: "Leere Gruppe erstellen",
    es: "Crear Grupo Vacío",
    fr: "Créer un Groupe Vide"
  },
  "admin.social.empty_filtered": {
    en: "No nodes match your filter criteria.",
    hu: "Nincs a szűrési feltételeknek megfelelő elem.",
    de: "Keine Elemente entsprechen den Filterkriterien.",
    es: "Ningún elemento coincide con sus criterios de filtrado.",
    fr: "Aucun élément ne correspond à vos critères de filtrage."
  },
  "admin.social.filter_all_types": {
    en: "All Types",
    hu: "Minden Típus",
    de: "Alle Typen",
    es: "Todos los Tipos",
    fr: "Tous les Types"
  },
  "admin.social.filter_groups_only": {
    en: "📁 Groups Only",
    hu: "📁 Csak Csoportok",
    de: "📁 Nur Gruppen",
    es: "📁 Solo Grupos",
    fr: "📁 Groupes Uniquement"
  },
  "admin.social.filter_links_only": {
    en: "🔗 Links Only",
    hu: "🔗 Csak Linkek",
    de: "🔗 Nur Links",
    es: "🔗 Solo Enlaces",
    fr: "🔗 Liens Uniquement"
  },
  "admin.social.filter_all_statuses": {
    en: "All Statuses",
    hu: "Minden Állapot",
    de: "Alle Status",
    es: "Todos los Estados",
    fr: "Tous les Statuts"
  },
  "admin.social.filter_active": {
    en: "Active (Visible)",
    hu: "Aktív (Látható)",
    de: "Aktiv (Sichtbar)",
    es: "Activo (Visible)",
    fr: "Actif (Visible)"
  },
  "admin.social.filter_disabled": {
    en: "Disabled (Hidden)",
    hu: "Kikapcsolt (Rejtett)",
    de: "Deaktiviert (Ausgeblendet)",
    es: "Deshabilitado (Oculto)",
    fr: "Désactivé (Masqué)"
  },
  "admin.social.toast_saved": {
    en: "Social item saved successfully.",
    hu: "Közösségi elem sikeresen mentve.",
    de: "Social-Media-Element erfolgreich gespeichert.",
    es: "Elemento social guardado con éxito.",
    fr: "Élément social enregistré avec succès."
  },
  "admin.social.toast_deleted": {
    en: "Social item deleted.",
    hu: "Közösségi elem törölve.",
    de: "Social-Media-Element gelöscht.",
    es: "Elemento social eliminado.",
    fr: "Élément social supprimé."
  },
  "admin.social.toast_reordered": {
    en: "Social links reordered.",
    hu: "Közösségi linkek átrendezve.",
    de: "Social-Links neu angeordnet.",
    es: "Enlaces sociales reordenados.",
    fr: "Liens sociaux réorganisés."
  },
  "admin.social.toast_enabled": {
    en: "Item enabled and visible in popup.",
    hu: "Elem bekapcsolva és látható a felugró ablakban.",
    de: "Element aktiviert und im Popup sichtbar.",
    es: "Elemento habilitado y visible en la ventana emergente.",
    fr: "Élément activé et visible dans la fenêtre contextuelle."
  },
  "admin.social.toast_disabled": {
    en: "Item hidden from popup.",
    hu: "Elem elrejtve a felugró ablakból.",
    de: "Element im Popup ausgeblendet.",
    es: "Elemento oculto de la ventana emergente.",
    fr: "Élément masqué de la fenêtre contextuelle."
  }
};

async function run() {
  console.log("Updating translations in src/lib/translations.ts and database...");

  // Update src/lib/translations.ts file
  const translationsFilePath = path.resolve(process.cwd(), "src/lib/translations.ts");
  let content = fs.readFileSync(translationsFilePath, "utf8");

  // Format strings to insert into each dictionary
  const enLines = Object.entries(pricingAndSocialTranslations).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v.en)},`).join("\n");
  const huLines = Object.entries(pricingAndSocialTranslations).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v.hu)},`).join("\n");
  const deLines = Object.entries(pricingAndSocialTranslations).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v.de)},`).join("\n");
  const esLines = Object.entries(pricingAndSocialTranslations).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v.es)},`).join("\n");
  const frLines = Object.entries(pricingAndSocialTranslations).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v.fr)},`).join("\n");

  // Inject into each dictionary before the closing brace of each export
  content = content.replace(/(export const enTranslations: TranslationDictionary = {)/, `$1\n${enLines}`);
  content = content.replace(/(export const huTranslations: TranslationDictionary = {)/, `$1\n${huLines}`);
  content = content.replace(/(export const deTranslations: TranslationDictionary = {)/, `$1\n${deLines}`);
  content = content.replace(/(export const esTranslations: TranslationDictionary = {)/, `$1\n${esLines}`);
  content = content.replace(/(export const frTranslations: TranslationDictionary = {)/, `$1\n${frLines}`);

  fs.writeFileSync(translationsFilePath, content, "utf8");
  console.log("src/lib/translations.ts updated successfully!");

  // Now sync to SQLite database
  await setupDatabase();
  const res = await translationService.importFromHardcoded(true);
  console.log(`Database synced with ${res.importedCount} translations across ${res.locales.join(", ")}!`);
}

run().catch((err) => {
  console.error("Error syncing translations:", err);
  process.exit(1);
});
