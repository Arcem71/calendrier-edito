// Planificateur pour les publications programmées
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ScheduledPublication {
  id: string;
  name: string;
  date: string;
  platforms: string[];
  description: string;
  images: any[];
  informations?: string;
  scheduledDate: Date;
}

class PublicationScheduler {
  private static instance: PublicationScheduler;
  private scheduledPublications: Map<string, NodeJS.Timeout> = new Map();
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeScheduler();
  }

  public static getInstance(): PublicationScheduler {
    if (!PublicationScheduler.instance) {
      PublicationScheduler.instance = new PublicationScheduler();
    }
    return PublicationScheduler.instance;
  }

  private initializeScheduler() {
    // Vérifier toutes les minutes s'il y a des publications à programmer
    this.intervalId = setInterval(() => {
      this.checkAndSchedulePublications();
    }, 60000); // Vérifier toutes les minutes

    // Charger les publications programmées au démarrage
    this.loadScheduledPublications();
    
    console.log('📅 Planificateur de publications initialisé');
  }

  private async loadScheduledPublications() {
    try {
      console.log('🔄 Chargement des publications programmées...');
      
      const { data: scheduledItems, error } = await supabase
        .from('editorial_calendar')
        .select('*')
        .eq('statut', 'Planifiée')
        .not('date_brute', 'is', null);

      if (error) {
        console.error('Erreur lors du chargement des publications programmées:', error);
        return;
      }

      if (!scheduledItems || scheduledItems.length === 0) {
        console.log('Aucune publication programmée trouvée');
        return;
      }

      console.log(`📊 ${scheduledItems.length} publication(s) programmée(s) trouvée(s)`);

      // Programmer chaque publication
      for (const item of scheduledItems) {
        this.schedulePublication({
          id: item.id,
          name: item.nom || item.name || 'Publication sans titre',
          date: item.date_brute,
          platforms: item.platformes ? item.platformes.split(',').filter(Boolean) : [],
          description: item.description || '',
          images: item.images || [],
          informations: item.informations,
          scheduledDate: new Date(`${item.date_brute}T09:00:00`)
        });
      }

    } catch (error) {
      console.error('Erreur lors du chargement des publications programmées:', error);
    }
  }

  private async checkAndSchedulePublications() {
    try {
      const { data: scheduledItems, error } = await supabase
        .from('editorial_calendar')
        .select('*')
        .eq('statut', 'Planifiée')
        .not('date_brute', 'is', null);

      if (error) return;

      if (scheduledItems) {
        for (const item of scheduledItems) {
          if (!this.scheduledPublications.has(item.id)) {
            this.schedulePublication({
              id: item.id,
              name: item.nom || item.name || 'Publication sans titre',
              date: item.date_brute,
              platforms: item.platformes ? item.platformes.split(',').filter(Boolean) : [],
              description: item.description || '',
              images: item.images || [],
              informations: item.informations,
              scheduledDate: new Date(`${item.date_brute}T09:00:00`)
            });
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des publications programmées:', error);
    }
  }

  public schedulePublication(publication: ScheduledPublication) {
    const now = new Date();
    const scheduledTime = publication.scheduledDate;

    // Vérifier si la date est dans le futur
    if (scheduledTime <= now) {
      console.log(`⚠️ Publication ${publication.name} programmée pour une date passée, ignorée`);
      return;
    }

    // Annuler la programmation existante si elle existe
    if (this.scheduledPublications.has(publication.id)) {
      clearTimeout(this.scheduledPublications.get(publication.id)!);
    }

    const timeUntilPublication = scheduledTime.getTime() - now.getTime();

    console.log(`⏰ Publication "${publication.name}" programmée pour le ${scheduledTime.toLocaleString('fr-FR')}`);
    console.log(`⏳ Temps restant: ${Math.round(timeUntilPublication / (1000 * 60 * 60))} heures`);

    const timeoutId = setTimeout(async () => {
      await this.executeScheduledPublication(publication);
    }, timeUntilPublication);

    this.scheduledPublications.set(publication.id, timeoutId);
  }

  private async executeScheduledPublication(publication: ScheduledPublication) {
    try {
      console.log(`🚀 Exécution de la publication programmée: ${publication.name}`);

      // Vérifier que la publication est toujours en statut "Planifiée"
      const { data: currentItem, error: fetchError } = await supabase
        .from('editorial_calendar')
        .select('statut')
        .eq('id', publication.id)
        .single();

      if (fetchError) {
        console.error('Erreur lors de la vérification du statut:', fetchError);
        return;
      }

      if (!currentItem || currentItem.statut !== 'Planifiée') {
        console.log(`❌ Publication ${publication.name} annulée (statut modifié: ${currentItem?.statut})`);
        this.scheduledPublications.delete(publication.id);
        return;
      }

      // Préparer les images pour la publication
      const hasUpvotes = publication.images.some((img: any) => img.vote === 'up');
      const hasDownvotes = publication.images.some((img: any) => img.vote === 'down');
      let imagesToPublish: string[];

      if (hasUpvotes) {
        imagesToPublish = publication.images
          .filter((img: any) => img.vote === 'up')
          .map((img: any) => img.url);
      } else if (!hasDownvotes) {
        imagesToPublish = publication.images.map((img: any) => img.url);
      } else {
        imagesToPublish = publication.images
          .filter((img: any) => img.vote !== 'down')
          .map((img: any) => img.url);
      }

      // Envoyer au webhook
      const payload = {
        nom: publication.name,
        images: imagesToPublish,
        description: publication.description,
        informations: publication.informations,
        plateformes: publication.platforms,
      };

      console.log('📤 Envoi au webhook:', payload);

      const response = await fetch('https://hook.eu2.make.com/t9qokr1n58rbxh7asshv5xe44itw6tgd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Erreur webhook: ${response.status} ${response.statusText}`);
      }

      console.log('✅ Publication envoyée au webhook avec succès');

      // Mettre à jour le statut à "Publiée"
      const { error: updateError } = await supabase
        .from('editorial_calendar')
        .update({ statut: 'Publiée' })
        .eq('id', publication.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du statut:', updateError);
        throw updateError;
      }

      console.log(`✅ Statut mis à jour à "Publiée" pour: ${publication.name}`);

      // Supprimer de la liste des publications programmées
      this.scheduledPublications.delete(publication.id);

      // Notification de succès
      toast.success(
        `Publication "${publication.name}" publiée automatiquement !`,
        { duration: 5000, icon: '🚀' }
      );

    } catch (error) {
      console.error(`❌ Erreur lors de la publication programmée de ${publication.name}:`, error);
      
      // Supprimer de la liste même en cas d'erreur pour éviter les répétitions
      this.scheduledPublications.delete(publication.id);

      // Notification d'erreur
      toast.error(
        `Erreur lors de la publication automatique de "${publication.name}": ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        { duration: 8000 }
      );
    }
  }

  public cancelScheduledPublication(publicationId: string) {
    if (this.scheduledPublications.has(publicationId)) {
      clearTimeout(this.scheduledPublications.get(publicationId)!);
      this.scheduledPublications.delete(publicationId);
      console.log(`❌ Publication programmée annulée: ${publicationId}`);
    }
  }

  public getScheduledPublications(): string[] {
    return Array.from(this.scheduledPublications.keys());
  }

  public getScheduledPublicationCount(): number {
    return this.scheduledPublications.size;
  }

  public destroy() {
    // Annuler toutes les publications programmées
    for (const [id, timeoutId] of this.scheduledPublications) {
      clearTimeout(timeoutId);
    }
    this.scheduledPublications.clear();

    // Arrêter l'intervalle de vérification
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('🛑 Planificateur de publications arrêté');
  }
}

// Initialiser le planificateur au chargement du module
export const publicationScheduler = PublicationScheduler.getInstance();

// Fonctions utilitaires pour l'utilisation externe
export const schedulePublication = (publication: ScheduledPublication) => {
  return publicationScheduler.schedulePublication(publication);
};

export const cancelScheduledPublication = (publicationId: string) => {
  return publicationScheduler.cancelScheduledPublication(publicationId);
};

export const getScheduledPublications = () => {
  return publicationScheduler.getScheduledPublications();
};

export const getScheduledPublicationCount = () => {
  return publicationScheduler.getScheduledPublicationCount();
};