import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MapboxComponent } from '@shared/map/mapbox.component';
import { AddProblemButtonComponent } from '@features/problem/add-problem-button.component';

@Component({
  selector: 'home-page',
  imports: [ReactiveFormsModule, MapboxComponent, AddProblemButtonComponent],
  template: `
    <section class="home-page">
      <mapbox-component></mapbox-component>
      <add-problem-button></add-problem-button>
    </section>
  `,
  host: {
    class: 'home-page-shell',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .home-page {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100dvh;
        box-sizing: border-box;
      }
    `,
  ],
})
export class HomePage {}
