import { inject, Injectable, signal } from '@angular/core';
import { Problem } from '@features/problem/problem.model';
import { UserService } from '@features/user/user.service';

@Injectable({ providedIn: 'root' })
export class ProblemStateService {
  private readonly userService = inject(UserService);
  private readonly problemsSignal = signal<Problem[]>([]);
  private nextProblemId = 1;

  getProblems() {
    return this.problemsSignal.asReadonly();
  }

  addProblem(problem: Problem): Problem {
    const newProblem: Problem = {
      ...problem,
      id: this.nextProblemId++,
    };
    this.problemsSignal.update((problems) => [...problems, newProblem]);
    return newProblem;
  }

  removeProblem(problemId: number): void {
    this.problemsSignal.update((problems) => problems.filter((p) => p.id !== problemId));
  }

  clearProblems(): void {
    this.problemsSignal.set([]);
    this.nextProblemId = 1;
  }
}
