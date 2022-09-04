import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SiteListComponent } from './site-list/site-list.component';

const routes: Routes = [
  { path: ':site/:zone', component: SiteListComponent },
  { path: ':site', component: SiteListComponent }
];

@NgModule({
  declarations: [],
  imports: [
    RouterModule.forRoot(routes)
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
