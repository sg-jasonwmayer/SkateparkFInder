import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {path: 'map', loadComponent: () => import('./map/map.component').then(mod => mod.MapComponent)},
  {path: 'home', loadComponent: () => import('./home/home.component').then(mod => mod.HomeComponent)},
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
