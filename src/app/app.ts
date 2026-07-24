import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: `
    :host {
      max-width: 720px;
      margin: 0 auto;
      padding: 2rem;
      display: block;
    }
  `,
})
export class App {}
