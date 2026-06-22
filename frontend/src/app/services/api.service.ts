import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  EvaluateResponse,
  ReportClaim,
  TwinSummary,
} from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = 'http://localhost:8000/api';

  constructor(private readonly http: HttpClient) {}

  getTwins(): Observable<TwinSummary[]> {
    return this.http.get<TwinSummary[]>(`${this.baseUrl}/twins`);
  }

  getDemoClaims(): Observable<ReportClaim[]> {
    return this.http.get<ReportClaim[]>(`${this.baseUrl}/demo-claims`);
  }

  evaluate(claim: ReportClaim): Observable<EvaluateResponse> {
    return this.http.post<EvaluateResponse>(`${this.baseUrl}/evaluate`, claim);
  }
}
