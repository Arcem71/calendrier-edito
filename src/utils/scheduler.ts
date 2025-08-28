// Planificateur pour envoyer les profils en attente d'acceptation tous les jours à 8h
import { supabase } from '../lib/supabase';

interface ScheduledTask {
  id: string;
  nextRun: Date;
  isRunning: boolean;
}

class ProspectionScheduler {
  private static instance: ProspectionScheduler;
  private scheduledTask: ScheduledTask | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {
    this.initializeScheduler();
  }

  public static getInstance(): ProspectionScheduler {
    if (!ProspectionScheduler.instance) {
      ProspectionScheduler.instance = new ProspectionScheduler();
    }
    return ProspectionScheduler.instance;
  }

  private initializeScheduler() {
    // Vérifier toutes les minutes si c'est l'heure d'exécuter la tâche
    this.intervalId = setInterval(() => {
      this.checkAndExecuteTask();
    }, 60000); // Vérifier toutes les minutes

    // Calculer la prochaine exécution à 8h
    this.scheduleNextRun();
    
    console.log('📅 Planificateur de prospection initialisé');
    console.log(`⏰ Prochaine exécution: ${this.scheduledTask?.nextRun.toLocaleString('fr-FR')}`);
  }

  private scheduleNextRun() {
    const now = new Date();
    const next8AM = new Date();
    
    // Définir l'heure à 8h00
    next8AM.setHours(8, 0, 0, 0);
    
    // Si on a dépassé 8h aujourd'hui, programmer pour demain
    if (now >= next8AM) {
      next8AM.setDate(next8AM.getDate() + 1);
    }

    this.scheduledTask = {
      id: 'daily-prospection-check',
      nextRun: next8AM,
      isRunning: false
    };
  }

  private async checkAndExecuteTask() {
    if (!this.scheduledTask || this.scheduledTask.isRunning) {
      return;
    }

    const now = new Date();
    
    // Vérifier si c'est l'heure d'exécuter (avec une marge de 1 minute)
    if (now >= this.scheduledTask.nextRun) {
      console.log('🚀 Exécution de la tâche quotidienne de prospection à', now.toLocaleString('fr-FR'));
      
      this.scheduledTask.isRunning = true;
      
      try {
        await this.sendPendingProfiles();
      } catch (error) {
        console.error('❌ Erreur lors de l\'exécution de la tâche quotidienne:', error);
      } finally {
        this.scheduledTask.isRunning = false;
        // Programmer la prochaine exécution
        this.scheduleNextRun();
        console.log(`⏰ Prochaine exécution programmée: ${this.scheduledTask.nextRun.toLocaleString('fr-FR')}`);
      }
    }
  }

  private async sendPendingProfiles() {
    try {
      console.log('📋 Récupération des profils en attente d\'acceptation...');
      
      // Récupérer tous les profils avec l'état "en attente d'acceptation"
      const { data: pendingProfiles, error } = await supabase
        .from('search_request')
        .select('*')
        .eq('etat', 'en attente d\'acceptation')
        .not('profil_link', 'is', null)
        .neq('profil_link', '');

      if (error) {
        throw new Error(`Erreur lors de la récupération des profils: ${error.message}`);
      }

      if (!pendingProfiles || pendingProfiles.length === 0) {
        console.log('ℹ️ Aucun profil en attente d\'acceptation trouvé');
        return;
      }

      console.log(`📊 ${pendingProfiles.length} profil(s) en attente d'acceptation trouvé(s)`);

      // Envoyer chaque profil au webhook
      let successCount = 0;
      let errorCount = 0;

      for (const profile of pendingProfiles) {
        try {
          console.log(`🔄 Envoi du profil: ${profile.nom} (${profile.profil_link})`);
          
          const response = await fetch('https://n8n.arcem-assurances.fr/webhook/prospection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'connexion verification',
              'lien LinkedIn': profile.profil_link
            }),
          });

          if (!response.ok) {
            throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.text();
          console.log(`✅ Profil ${profile.nom} envoyé avec succès. Réponse: ${result}`);
          successCount++;

          // Petite pause entre les appels pour éviter de surcharger le webhook
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Erreur lors de l'envoi du profil ${profile.nom}:`, error);
          errorCount++;
        }
      }

      // Log du résumé
      console.log('📈 RÉSUMÉ DE L\'ENVOI QUOTIDIEN:');
      console.log(`✅ Succès: ${successCount} profil(s)`);
      console.log(`❌ Échecs: ${errorCount} profil(s)`);
      console.log(`📊 Total traité: ${pendingProfiles.length} profil(s)`);

      // Optionnel: Vous pourriez aussi envoyer un résumé par email ou notification
      if (successCount > 0) {
        console.log(`🎯 ${successCount} profil(s) en attente d'acceptation envoyé(s) au webhook pour vérification`);
      }

    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi des profils en attente:', error);
      throw error;
    }
  }

  public getNextRunTime(): Date | null {
    return this.scheduledTask?.nextRun || null;
  }

  public isTaskRunning(): boolean {
    return this.scheduledTask?.isRunning || false;
  }

  public async executeNow(): Promise<void> {
    console.log('🚀 Exécution manuelle de la tâche de prospection...');
    if (this.scheduledTask) {
      this.scheduledTask.isRunning = true;
    }
    
    try {
      await this.sendPendingProfiles();
    } finally {
      if (this.scheduledTask) {
        this.scheduledTask.isRunning = false;
      }
    }
  }

  public destroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.scheduledTask = null;
    console.log('🛑 Planificateur de prospection arrêté');
  }
}

// Initialiser le planificateur au chargement du module
export const prospectionScheduler = ProspectionScheduler.getInstance();

// Fonction utilitaire pour l'exécution manuelle
export const executeProspectionTaskNow = () => {
  return prospectionScheduler.executeNow();
};

// Fonction pour obtenir les informations sur la prochaine exécution
export const getNextScheduledRun = () => {
  return prospectionScheduler.getNextRunTime();
};

// Fonction pour vérifier si une tâche est en cours
export const isSchedulerRunning = () => {
  return prospectionScheduler.isTaskRunning();
};