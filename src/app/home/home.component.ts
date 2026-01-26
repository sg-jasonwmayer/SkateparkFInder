import { Component } from '@angular/core';

@Component({
  selector: 'app-home',
  template: `
    <section class="home-hero">
      <div class="home-hero__content">
        <h1 class="home-hero__title">Find Your Next Line</h1>
        <p class="home-hero__subtitle">
          Discover skateparks near you and plan your perfect session.
        </p>
        <div class="home-hero__actions">
          <a class="btn btn--accent" routerLink="/map">Open Map</a>
          <a class="btn btn--ghost" routerLink="/welcome">About</a>
        </div>
      </div>
    </section>
  `,
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {

}
