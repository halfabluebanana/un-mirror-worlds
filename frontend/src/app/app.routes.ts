import { Routes } from '@angular/router';
import { EvaluatePageComponent } from './components/evaluate-page/evaluate-page.component';

export const routes: Routes = [
  { path: '', component: EvaluatePageComponent },
  { path: '**', redirectTo: '' },
];
