import { Routes } from '@angular/router';
import { EvaluatePageComponent } from './components/evaluate-page/evaluate-page.component';
import { TwinsPageComponent } from './components/twins-page/twins-page.component';

export const routes: Routes = [
  { path: '', component: EvaluatePageComponent },
  { path: 'twins', component: TwinsPageComponent },
  { path: '**', redirectTo: '' },
];
