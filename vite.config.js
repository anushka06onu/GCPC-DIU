import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        admin: './admin.html',
        verify: './verify.html',
        join: './join.html',
        contact: './contact.html',
        event: './event.html',
        wing_acm: './wing-acm.html',
        wing_career: './wing-career.html',
        wing_pr: './wing-pr.html',
        wing_research: './wing-research.html',
        achievement_contest: './achievement-contest-recognition.html',
        achievement_hackathon: './achievement-hackathon-participation.html',
        achievement_stories: './achievement-member-success-stories.html',
        achievement_research: './achievement-research-publications.html',
        past_acm: './past-acm-sprint.html',
        past_career: './past-career-session.html',
        past_research: './past-research-seminar.html',
        event_acm_backend: './event-acm-backend-workshop.html',
        event_acm_sprint: './event-acm-sprint.html',
        event_career_bootcamp: './event-career-bootcamp.html',
        event_career_grooming: './event-career-development-grooming.html',
        event_career_graphic: './event-career-graphic-design.html',
        event_research_workshop: './event-research-workshop.html',
        event_research_zero: './event-research-zero-to-published.html',
        research_tracker: './research-publication-tracker.html',
        women_tech: './women-in-tech-spotlight.html'
      }
    }
  },
  server: {
    port: 3000
  }
});
