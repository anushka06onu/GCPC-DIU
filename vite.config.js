import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        admin_redirect: './admin.html',
        verify_redirect: './verify.html',
        join_redirect: './join.html',
        contact_redirect: './contact.html',
        admin: './admin/index.html',
        verify: './verify/index.html',
        join: './join/index.html',
        contact: './contact/index.html',
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
  },
  plugins: [
    {
      name: 'html-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const cleanPath = req.url.split('?')[0];
          // 1. SPA-style paths that rewrite to /index.html
          const spaPaths = ['/home', '/about', '/wings', '/committee', '/events', '/gallery'];
          if (spaPaths.includes(cleanPath)) {
            req.url = '/index.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
            next();
            return;
          }
          
          // 2. Clean URLs that map to .html files if they exist
          if (cleanPath !== '/' && !cleanPath.includes('.') && !cleanPath.endsWith('/')) {
            const filePath = path.join(__dirname, cleanPath + '.html');
            if (fs.existsSync(filePath)) {
              req.url = cleanPath + '.html' + (req.url.includes('?') ? '?' + req.url.split('?')[1] : '');
            }
          }
          next();
        });
      }
    }
  ]
});
