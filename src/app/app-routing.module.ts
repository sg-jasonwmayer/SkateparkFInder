import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LayoutComponent } from './layout/layout.component';

const routes: Routes = [
  {path: 'map', loadComponent: () => import('./map/map.component').then(mod => mod.MapComponent)},
  {path: 'home', loadComponent: () => import('./home/home.component').then(mod => mod.HomeComponent)},
  { path: 'first-component', component: LayoutComponent},

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
