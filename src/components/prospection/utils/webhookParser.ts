// Fonction pour parser la réponse texte structurée du webhook
export const parseWebhookTextResponse = (responseText: string, originalQuery: string) => {
  console.log('Parsing webhook text response:', responseText);
  
  const profiles: any[] = [];
  
  // Diviser le texte par les points-virgules pour séparer les profils
  const profileSections = responseText.split(/;(?=nom:)/);
  
  for (const section of profileSections) {
    if (!section.trim()) continue;
    
    const profile: any = {
      search_request: originalQuery,
      etat: 'en attente d\'acceptation'
    };
    
    // Parser chaque ligne du profil
    const lines = section.split('\n');
    let currentField = '';
    let currentValue = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Vérifier si c'est une nouvelle ligne de champ (contient ':')
      const fieldMatch = trimmedLine.match(/^(nom|secteur|entreprise|profil_link|mbti|message|bio|etat|search_request):\s*(.*)$/);
      
      if (fieldMatch) {
        // Sauvegarder le champ précédent s'il existe
        if (currentField && currentValue.trim()) {
          profile[currentField] = currentValue.trim();
        }
        
        // Commencer un nouveau champ
        currentField = fieldMatch[1];
        currentValue = fieldMatch[2];
      } else if (currentField && trimmedLine) {
        // Continuer le champ actuel (ligne de continuation)
        currentValue += '\n' + trimmedLine;
      }
    }
    
    // Sauvegarder le dernier champ
    if (currentField && currentValue.trim()) {
      profile[currentField] = currentValue.trim();
    }
    
    // Post-traitement pour extraire les informations supplémentaires
    // Traiter le secteur qui peut contenir "entreprise: nom"
    if (profile.secteur && profile.secteur.includes(' entreprise:')) {
      const secteurMatch = profile.secteur.match(/^(.+?)\s+entreprise:\s*(.*)$/);
      if (secteurMatch) {
        profile.secteur = secteurMatch[1].trim();
        // Toujours mettre à jour l'entreprise depuis le secteur
        profile.entreprise = secteurMatch[2].trim();
      }
    }
    
    // Traiter l'état qui peut contenir "search_request: requete"
    if (profile.etat && profile.etat.includes(' search_request:')) {
      const etatMatch = profile.etat.match(/^(.+?)\s+search_request:\s*(.*)$/);
      if (etatMatch) {
        profile.etat = etatMatch[1].trim();
        profile.search_request = etatMatch[2].trim();
      }
    }
    
    // Ajouter des valeurs par défaut si nécessaire
    if (!profile.nom) profile.nom = `Prospect ${profiles.length + 1}`;
    if (!profile.secteur) profile.secteur = '';
    if (!profile.entreprise) profile.entreprise = '';
    if (!profile.profil_link) profile.profil_link = '';
    if (!profile.mbti) profile.mbti = '';
    if (!profile.message) profile.message = '';
    if (!profile.bio) profile.bio = '';
    if (!profile.etat) profile.etat = 'en attente d\'acceptation';
    if (!profile.search_request) profile.search_request = originalQuery;
    
    profiles.push(profile);
  }
  
  console.log('Parsed profiles:', profiles);
  return profiles;
};