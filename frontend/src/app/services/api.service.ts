import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  AnalyzeResponse,
  EvaluateResponse,
  ExtractResponse,
  ExtractionConfig,
  ReportClaim,
  TwinSummary,
} from '../models/evaluation.model';

export interface IngestPayload {
  url?: string;
  text?: string;
  title?: string;
  use_llm?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly baseUrl = '/api';

  constructor(private readonly http: HttpClient) {}

  getTwins(): Observable<TwinSummary[]> {
    return this.http.get<TwinSummary[]>(`${this.baseUrl}/twins`);
  }

  getDemoClaims(): Observable<ReportClaim[]> {
    return this.http.get<ReportClaim[]>(`${this.baseUrl}/demo-claims`);
  }

  getExtractionConfig(): Observable<ExtractionConfig> {
    return this.http.get<ExtractionConfig>(`${this.baseUrl}/extraction-config`);
  }

  evaluate(claim: ReportClaim): Observable<EvaluateResponse> {
    return this.http.post<EvaluateResponse>(`${this.baseUrl}/evaluate`, claim);
  }

  extract(payload: IngestPayload): Observable<ExtractResponse> {
    return this.http.post<ExtractResponse>(`${this.baseUrl}/extract`, payload);
  }

  analyze(payload: IngestPayload): Observable<AnalyzeResponse> {
    return this.http.post<AnalyzeResponse>(`${this.baseUrl}/analyze`, payload);
  }
}
