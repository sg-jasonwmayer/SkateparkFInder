import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {ChangeDetectionStrategy, Component} from '@angular/core';
import {MatDividerModule} from '@angular/material/divider';
import {MatListModule} from '@angular/material/list';
@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    MatSlideToggleModule,
    MatListModule, 
    MatDividerModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent {

}
