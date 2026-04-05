import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, UserRole, User } from '../../services/auth.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Background elements matching login page -->
      <div class="dot-pattern"></div>
      <div class="shape-1"></div>
      <div class="shape-2"></div>

      <!-- Navbar -->
      <nav class="navbar">
        <div class="nav-brand">
          <i class="fas fa-user-graduate"></i>
          <span>Student Portal</span>
        </div>
        <div class="nav-menu">
          <a class="nav-link" (click)="router.navigate(['/student/dashboard'])">
            <i class="fas fa-tachometer-alt"></i> Dashboard
          </a>
          <a class="nav-link" (click)="router.navigate(['/stages'])">
            <i class="fas fa-briefcase"></i> My Internship
          </a>
          <a class="nav-link" (click)="router.navigate(['/student/logbook'])">
            <i class="fas fa-book"></i> Logbook
          </a>
          <a class="nav-link" (click)="router.navigate(['/student/tasks'])">
            <i class="fas fa-tasks"></i> Tasks
          </a>
        </div>
        <div class="nav-user">
          <span class="user-info">{{ (userName$ | async) }}</span>
          <button class="logout-btn" (click)="logout()">
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Welcome Section -->
        <div class="welcome-section">
          <div class="welcome-card">
            <h1>
              <i class="fas fa-user-graduate"></i>
              Student Dashboard
            </h1>
            <p>{{ welcomeMessage$ | async }}</p>
          </div>
        </div>

        <!-- Internship Details -->
        <div class="internship-section">
          <h2>My Internship</h2>
          <div class="internship-card">
            <div class="internship-header">
              <div class="company-info">
                <h3>{{ (internshipData$ | async)?.company || 'Tech Solutions Inc.' }}</h3>
                <p><i class="fas fa-map-marker-alt"></i> {{ (internshipData$ | async)?.location || 'Tunis, Tunisia' }}</p>
              </div>
              <div class="internship-status">
                <span class="status-badge status-active">Active</span>
              </div>
            </div>
            <div class="internship-details">
              <div class="detail-item">
                <i class="fas fa-briefcase"></i>
                <div>
                  <strong>Position:</strong>
                  <p>{{ (internshipData$ | async)?.position || 'Software Development Intern' }}</p>
                </div>
              </div>
              <div class="detail-item">
                <i class="fas fa-calendar"></i>
                <div>
                  <strong>Duration:</strong>
                  <p>{{ (internshipData$ | async)?.duration || '3 months' }} ({{ (internshipData$ | async)?.remainingDays || 45 }} days remaining)</p>
                </div>
              </div>
              <div class="detail-item">
                <i class="fas fa-user-tie"></i>
                <div>
                  <strong>Supervisor:</strong>
                  <p>{{ (internshipData$ | async)?.supervisor || 'Dr. Mohamed Ali' }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Weekly Progress -->
        <div class="progress-section">
          <h2>Weekly Progress</h2>
          <div class="progress-grid">
            <div class="progress-card">
              <div class="progress-header">
                <h3>Week 1</h3>
                <span class="progress-status completed">Completed</span>
              </div>
              <p>Orientation and company introduction</p>
              <div class="progress-bar">
                <div class="progress-fill completed"></div>
              </div>
            </div>
            <div class="progress-card">
              <div class="progress-header">
                <h3>Week 2</h3>
                <span class="progress-status completed">Completed</span>
              </div>
              <p>Project setup and requirements gathering</p>
              <div class="progress-bar">
                <div class="progress-fill completed"></div>
              </div>
            </div>
            <div class="progress-card">
              <div class="progress-header">
                <h3>Week 3</h3>
                <span class="progress-status in-progress">In Progress</span>
              </div>
              <p>Development and implementation phase</p>
              <div class="progress-bar">
                <div class="progress-fill in-progress" style="width: 60%"></div>
              </div>
            </div>
            <div class="progress-card">
              <div class="progress-header">
                <h3>Week 4</h3>
                <span class="progress-status pending">Pending</span>
              </div>
              <p>Testing and documentation</p>
              <div class="progress-bar">
                <div class="progress-fill pending" style="width: 0%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tasks Integration -->
        <div class="tasks-section">
          <h2>External Tasks</h2>
          <div class="tasks-container">
            <div class="tasks-header">
              <div class="task-source">
                <i class="fab fa-jira"></i>
                <h3>Jira Tasks</h3>
              </div>
              <button class="sync-btn" (click)="syncTasks()">
                <i class="fas fa-sync"></i> Sync
              </button>
            </div>
            <div class="tasks-list">
              <div class="task-item" *ngFor="let task of (tasks$ | async)">
                <div class="task-priority priority-{{ task.priority }}"></div>
                <div class="task-content">
                  <h4>{{ task.title }}</h4>
                  <p>{{ task.description }}</p>
                  <div class="task-meta">
                    <span><i class="fas fa-calendar"></i> {{ task.dueDate }}</span>
                    <span><i class="fas fa-flag"></i> {{ task.priority }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Update Submission -->
        <div class="update-section">
          <h2>Submit Update</h2>
          <div class="update-form">
            <div class="form-group">
              <label for="update-type">Update Type</label>
              <select id="update-type" class="form-control">
                <option>Weekly Progress</option>
                <option>Task Completion</option>
                <option>Issue Report</option>
                <option>General Update</option>
              </select>
            </div>
            <div class="form-group">
              <label for="update-content">Content</label>
              <textarea id="update-content" class="form-control" rows="4" 
                        placeholder="Describe your progress, achievements, or any issues..."></textarea>
            </div>
            <div class="form-group">
              <label for="update-file">Attachment (optional)</label>
              <input type="file" id="update-file" class="form-control" accept=".pdf,.doc,.docx,.jpg,.png">
            </div>
            <button class="submit-btn" (click)="submitUpdate()">
              <i class="fas fa-paper-plane"></i> Submit Update
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Use same variables as login page for consistency */
    :host {
      --primary-color: #104778;
      --secondary-color: #2596be;
      --accent-color: #cbd812;
      --bg-light: #ecefcf;
      --text-main: #1f2937;
      --text-muted: #6b7280;
      --white: #ffffff;
      --error: #dc2626;
      --success: #16a34a;
      --warning: #f59e0b;
      --transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      --shadow-sm: 0 2px 4px rgba(0,0,0,0.02);
      --shadow-md: 0 8px 24px rgba(0,0,0,0.06);
      --shadow-lg: 0 20px 40px rgba(0,0,0,0.1);
      --shadow-xl: 0 30px 60px rgba(0,0,0,0.12);
      display: block;
      min-height: 100vh;
    }

    .dashboard-container {
      position: relative;
      min-height: 100vh;
      background: linear-gradient(135deg, var(--bg-light) 0%, var(--white) 100%);
      overflow-x: hidden;
    }

    /* Background elements matching login page */
    .dot-pattern {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: radial-gradient(circle, var(--primary-color) 1px, transparent 1px);
      background-size: 20px 20px;
      opacity: 0.03;
      z-index: 0;
    }

    .shape-1 {
      position: fixed;
      top: 10%;
      right: 5%;
      width: 200px;
      height: 200px;
      background: var(--secondary-color);
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.1;
      z-index: 0;
    }

    .shape-2 {
      position: fixed;
      bottom: 10%;
      left: 5%;
      width: 150px;
      height: 150px;
      background: var(--accent-color);
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.1;
      z-index: 0;
    }

    /* Navbar */
    .navbar {
      background: var(--white);
      box-shadow: var(--shadow-md);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 10;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }

    .nav-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: var(--primary-color);
      font-size: 1.2rem;
    }

    .nav-menu {
      display: flex;
      gap: 2rem;
      align-items: center;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--text-muted);
      text-decoration: none;
      font-weight: 500;
      transition: var(--transition);
      cursor: pointer;
    }

    .nav-link:hover {
      color: var(--primary-color);
      transform: translateY(-2px);
    }

    .nav-user {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-info {
      color: var(--text-main);
      font-weight: 500;
    }

    .logout-btn {
      background: var(--error);
      color: var(--white);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      transition: var(--transition);
    }

    .logout-btn:hover {
      background: #b91c1c;
      transform: translateY(-2px);
    }

    /* Main Content */
    .main-content {
      position: relative;
      z-index: 1;
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Welcome Section */
    .welcome-section {
      margin-bottom: 3rem;
    }

    .welcome-card {
      background: var(--white);
      padding: 2rem;
      border-radius: 16px;
      box-shadow: var(--shadow-lg);
      text-align: center;
      border-left: 4px solid var(--secondary-color);
    }

    .welcome-card h1 {
      color: var(--secondary-color);
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 2rem;
    }

    .welcome-card p {
      color: var(--text-muted);
      font-size: 1.1rem;
      margin: 0;
    }

    /* Section Headers */
    .internship-section,
    .progress-section,
    .tasks-section,
    .update-section {
      margin-bottom: 3rem;
    }

    .internship-section h2,
    .progress-section h2,
    .tasks-section h2,
    .update-section h2 {
      color: var(--text-main);
      margin-bottom: 2rem;
      font-size: 1.5rem;
      font-weight: 600;
    }

    /* Internship Card */
    .internship-card {
      background: var(--white);
      padding: 2rem;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      border-left: 4px solid var(--accent-color);
    }

    .internship-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
    }

    .company-info h3 {
      color: var(--text-main);
      margin-bottom: 0.5rem;
      font-size: 1.3rem;
    }

    .company-info p {
      color: var(--text-muted);
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .status-active {
      background: var(--success);
      color: var(--white);
    }

    .internship-details {
      display: grid;
      gap: 1.5rem;
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
    }

    .detail-item i {
      width: 40px;
      height: 40px;
      background: var(--primary-color);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      flex-shrink: 0;
    }

    .detail-item strong {
      color: var(--text-main);
      display: block;
      margin-bottom: 0.5rem;
    }

    .detail-item p {
      color: var(--text-muted);
      margin: 0;
      line-height: 1.5;
    }

    /* Progress Grid */
    .progress-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .progress-card {
      background: var(--white);
      padding: 1.5rem;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .progress-header h3 {
      color: var(--text-main);
      margin: 0;
    }

    .progress-status {
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .completed {
      background: var(--success);
      color: var(--white);
    }

    .in-progress {
      background: var(--warning);
      color: var(--white);
    }

    .pending {
      background: var(--text-muted);
      color: var(--white);
    }

    .progress-bar {
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 1rem;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .progress-fill.completed {
      background: var(--success);
      width: 100%;
    }

    .progress-fill.in-progress {
      background: var(--warning);
    }

    /* Tasks Section */
    .tasks-container {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .tasks-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .task-source {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .task-source i {
      color: #0052cc;
      font-size: 1.5rem;
    }

    .task-source h3 {
      color: var(--text-main);
      margin: 0;
    }

    .sync-btn {
      background: var(--primary-color);
      color: var(--white);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      transition: var(--transition);
    }

    .sync-btn:hover {
      background: var(--secondary-color);
    }

    .tasks-list {
      padding: 1.5rem;
    }

    .task-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      border: 1px solid #e5e7eb;
      transition: var(--transition);
    }

    .task-item:hover {
      border-color: var(--primary-color);
      box-shadow: var(--shadow-sm);
    }

    .task-priority {
      width: 4px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .priority-high {
      background: var(--error);
    }

    .priority-medium {
      background: var(--warning);
    }

    .priority-low {
      background: var(--success);
    }

    .task-content {
      flex: 1;
    }

    .task-content h4 {
      color: var(--text-main);
      margin-bottom: 0.5rem;
    }

    .task-content p {
      color: var(--text-muted);
      margin-bottom: 1rem;
      line-height: 1.5;
    }

    .task-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .task-meta span {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    /* Update Form */
    .update-form {
      background: var(--white);
      padding: 2rem;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      color: var(--text-main);
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 1rem;
      transition: var(--transition);
    }

    .form-control:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(16, 71, 120, 0.1);
    }

    .submit-btn {
      background: var(--primary-color);
      color: var(--white);
      border: none;
      padding: 1rem 2rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      transition: var(--transition);
      font-size: 1rem;
    }

    .submit-btn:hover {
      background: var(--secondary-color);
      transform: translateY(-2px);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .navbar {
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
      }

      .nav-menu {
        flex-wrap: wrap;
        justify-content: center;
        gap: 1rem;
      }

      .main-content {
        padding: 1rem;
      }

      .progress-grid {
        grid-template-columns: 1fr;
      }

      .tasks-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .internship-header {
        flex-direction: column;
        gap: 1rem;
      }
    }
  `]
})
export class StudentDashboard implements OnInit {
  currentUser$: Observable<User | null>;
  userName$: Observable<string>;
  welcomeMessage$: Observable<string>;
  internshipData$: Observable<any>;
  tasks$: Observable<any[]>;

  constructor(
    private authService: AuthService,
    public router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.userName$ = this.currentUser$.pipe(
      map(user => user ? `${user.prenom} ${user.nom}` : 'Student')
    );
    this.welcomeMessage$ = this.currentUser$.pipe(
      map(user => user ? `Welcome back, ${user.prenom}! Track your internship progress here.` : 'Welcome to the Student Portal')
    );
    this.internshipData$ = this.initializeInternshipData();
    this.tasks$ = this.initializeTasks();
  }

  ngOnInit(): void {}

  private initializeInternshipData(): Observable<any> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          company: 'Tech Solutions Inc.',
          location: 'Tunis, Tunisia',
          position: 'Software Development Intern',
          duration: '3 months',
          remainingDays: 45,
          supervisor: 'Dr. Mohamed Ali'
        });
        observer.complete();
      }, 500);
    });
  }

  private initializeTasks(): Observable<any[]> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next([
          {
            title: 'Implement user authentication',
            description: 'Add JWT-based authentication to the application',
            priority: 'high',
            dueDate: '2024-04-15'
          },
          {
            title: 'Design database schema',
            description: 'Create ERD and SQL scripts for the new module',
            priority: 'medium',
            dueDate: '2024-04-18'
          },
          {
            title: 'Write unit tests',
            description: 'Create comprehensive test suite for existing features',
            priority: 'low',
            dueDate: '2024-04-20'
          }
        ]);
        observer.complete();
      }, 500);
    });
  }

  syncTasks(): void {
    // Simulate task synchronization
    console.log('Syncing tasks from Jira/Trello...');
  }

  submitUpdate(): void {
    // Handle update submission
    console.log('Submitting student update...');
  }

  logout(): void {
    this.authService.logout();
  }
}
