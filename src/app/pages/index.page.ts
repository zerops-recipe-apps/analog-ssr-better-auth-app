import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  imports: [],
  template: `
    <main>
      <h1>Analog + Better Auth</h1>
      <p>
        Analog SSR application with
        <a href="https://www.better-auth.com" target="_blank" rel="noopener"
          >Better Auth</a
        >
        authentication, backed by PostgreSQL.
      </p>
      <ul>
        <li>Auth API mounted at <code>/api/auth/*</code></li>
        <li>Health check at <code>/api/health</code></li>
      </ul>
    </main>
  `,
})
export default class Home {}
