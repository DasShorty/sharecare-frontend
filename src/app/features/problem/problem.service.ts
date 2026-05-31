import { inject, Injectable } from '@angular/core';
import { Problem } from '@features/problem/problem.model';
import { HttpClient } from '@angular/common/http';
import { ProblemStateService } from '@features/problem/problem-state.service';

@Injectable({ providedIn: 'root' })
export class ProblemService {
  private readonly httpClient = inject(HttpClient);
  private readonly problemStateService = inject(ProblemStateService);

  getProblems() {
    return this.problemStateService.getProblems();
  }

  addProblem(problem: Problem) {
    return this.problemStateService.addProblem(problem);
  }

  /**
   * Send a problem to a backend endpoint. The method returns the HTTP observable.
   * Caller can subscribe and, on success, decide to add the problem to local state.
   */
  createProblemRemote(problem: Problem, endpoint = '/api/problems') {
    return this.httpClient.post<Problem>(endpoint, problem);
  }

  removeProblem(problemId: number) {
    this.problemStateService.removeProblem(problemId);
  }
}
