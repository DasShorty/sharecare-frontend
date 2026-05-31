import { Injectable, signal } from '@angular/core';
import { Problem } from '@features/problem/problem.model';

@Injectable({ providedIn: 'root' })
export class ProblemStateService {
  private readonly STORAGE_KEY = 'share-care-problems';
  private readonly problemsSignal = signal<Problem[]>(this.loadProblemsFromStorage());
  private nextProblemId = this.computeNextId(this.problemsSignal());

  getProblems() {
    return this.problemsSignal.asReadonly();
  }

  addProblem(problem: Problem): Problem {
    const newProblem: Problem = {
      ...problem,
      id: this.nextProblemId++,
    };
    this.appendProblem(newProblem);
    return newProblem;
  }

  setProblems(problems: Problem[]): void {
    const next = [...problems];
    this.problemsSignal.set(next);
    this.nextProblemId = this.computeNextId(next);
    this.saveProblemsToStorage(next);
  }

  appendProblem(problem: Problem): Problem {
    this.problemsSignal.update((problems) => {
      const next = [...problems, problem];
      this.saveProblemsToStorage(next);
      return next;
    });
    this.nextProblemId = Math.max(this.nextProblemId, this.computeNextId([problem]));
    return problem;
  }

  removeProblem(problemId: number): void {
    this.problemsSignal.update((problems) => {
      const next = problems.filter((p) => p.id !== problemId);
      this.saveProblemsToStorage(next);
      return next;
    });
  }

  clearProblems(): void {
    this.problemsSignal.set([]);
    this.nextProblemId = 1;
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  private saveProblemsToStorage(problems: Problem[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(problems));
    } catch (err) {
      console.error('Failed to persist problems to localStorage', err);
    }
  }

  private loadProblemsFromStorage(): Problem[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as Problem[] | null;
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (err) {
      console.error('Failed to read problems from localStorage', err);
      return [];
    }
  }

  private computeNextId(list: Problem[]): number {
    if (!list || list.length === 0) return 1;
    const max = list.reduce((m, p) => Math.max(m, p.id ?? 0), 0);
    return max + 1;
  }
}
