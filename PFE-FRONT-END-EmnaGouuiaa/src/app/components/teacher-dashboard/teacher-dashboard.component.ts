import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, UserRole, User } from '../../services/auth.service';

@Component({
  selector: 'app-teacher-dashboard',
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
          <i class="fas fa-chalkboard-teacher"></i>
          <span>Teacher Portal</span>
        </div>
        <div class="nav-menu">
          <a class="nav-link" (click)="router.navigate(['/teacher/dashboard'])">
            <i class="fas fa-tachometer-alt"></i> Dashboard
          </a>
          <a class="nav-link" (click)="router.navigate(['/teacher/students'])">
            <i class="fas fa-user-graduate"></i> Students
          </a>
          <a class="nav-link" (click)="router.navigate(['/teacher/topics'])">
            <i class="fas fa-book"></i> Topics
          </a>
          <a class="nav-link" (click)="router.navigate(['/teacher/evaluations'])">
            <i class="fas fa-clipboard-check"></i> Evaluations
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
              <i class="fas fa-chalkboard-teacher"></i>
              Academic Supervisor Dashboard
            </h1>
            <p>{{ welcomeMessage$ | async }}</p>
          </div>
        </div>

        <!-- Assigned Students -->
        <div class="students-section">
          <h2>Assigned Students</h2>
          <div class="students-grid">
            <div class="student-card" *ngFor="let student of (students$ | async)">
              <div class="student-header">
                <div class="student-avatar">
                  <i class="fas fa-user-graduate"></i>
                </div>
                <div class="student-info">
                  <h3>{{ student.name }}</h3>
                  <p>{{ student.email }}</p>
                  <span class="internship-badge">{{ student.internship }}</span>
                </div>
                <div class="student-status">
                  <span class="status-badge status-{{ student.status }}">{{ student.status }}</span>
                </div>
              </div>
              <div class="student-progress">
                <div class="progress-item">
                  <span>Progress</span>
                  <div class="progress-bar">
                    <div class="progress-fill" [style.width.%]="student.progress"></div>
                  </div>
                  <span class="progress-text">{{ student.progress }}%</span>
                </div>
                <div class="progress-item">
                  <span>Last Activity</span>
                  <span>{{ student.lastActivity }}</span>
                </div>
              </div>
              <div class="student-actions">
                <button class="action-btn-small" (click)="viewStudentDetails(student)">
                  <i class="fas fa-eye"></i> View Details
                </button>
                <button class="action-btn-small" (click)="evaluateStudent(student)">
                  <i class="fas fa-clipboard-check"></i> Evaluate
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Topic Validation -->
        <div class="topics-section">
          <h2>Internship Topic Validation</h2>
          <div class="topics-container">
            <div class="topics-header">
              <h3>Pending Topic Approvals</h3>
              <button class="refresh-btn" (click)="refreshTopics()">
                <i class="fas fa-sync"></i> Refresh
              </button>
            </div>
            <div class="topics-list">
              <div class="topic-item" *ngFor="let topic of (pendingTopics$ | async)">
                <div class="topic-content">
                  <div class="topic-header">
                    <h4>{{ topic.title }}</h4>
                    <span class="topic-date">{{ topic.submissionDate }}</span>
                  </div>
                  <p class="topic-description">{{ topic.description }}</p>
                  <div class="topic-meta">
                    <span><i class="fas fa-user"></i> {{ topic.student }}</span>
                    <span><i class="fas fa-building"></i> {{ topic.company }}</span>
                    <span class="topic-status status-{{ topic.status }}">{{ topic.status }}</span>
                  </div>
                </div>
                <div class="topic-actions">
                  <button class="approve-btn" (click)="approveTopic(topic)">
                    <i class="fas fa-check"></i> Approve
                  </button>
                  <button class="reject-btn" (click)="rejectTopic(topic)">
                    <i class="fas fa-times"></i> Reject
                  </button>
                  <button class="review-btn" (click)="requestChanges(topic)">
                    <i class="fas fa-edit"></i> Request Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Tracking -->
        <div class="tracking-section">
          <h2>Student Progress Tracking</h2>
          <div class="tracking-grid">
            <div class="tracking-card">
              <div class="tracking-header">
                <i class="fas fa-chart-line"></i>
                <h3>Overall Progress</h3>
              </div>
              <div class="tracking-stats">
                <div class="stat">
                  <span class="stat-number">{{ (trackingStats$ | async)?.averageProgress || 75 }}%</span>
                  <span class="stat-label">Average Progress</span>
                </div>
                <div class="stat">
                  <span class="stat-number">{{ (trackingStats$ | async)?.completedInternships || 12 }}</span>
                  <span class="stat-label">Completed</span>
                </div>
                <div class="stat">
                  <span class="stat-number">{{ (trackingStats$ | async)?.activeInternships || 8 }}</span>
                  <span class="stat-label">In Progress</span>
                </div>
              </div>
            </div>
            <div class="tracking-card">
              <div class="tracking-header">
                <i class="fas fa-calendar-check"></i>
                <h3>Recent Activities</h3>
              </div>
              <div class="activity-list">
                <div class="activity-item" *ngFor="let activity of (recentActivities$ | async)">
                  <div class="activity-icon">
                    <i class="fas fa-{{ activity.icon }}"></i>
                  </div>
                  <div class="activity-content">
                    <h4>{{ activity.title }}</h4>
                    <p>{{ activity.description }}</p>
                    <span class="activity-time">{{ activity.time }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Task Assignment -->
        <div class="tasks-section">
          <h2>Task Assignment</h2>
          <div class="task-assignment">
            <div class="assignment-form">
              <h3>Assign New Task</h3>
              <div class="form-row">
                <div class="form-group">
                  <label for="student-select">Student</label>
                  <select id="student-select" class="form-control">
                    <option value="">Select a student...</option>
                    <option *ngFor="let student of (students$ | async)" [value]="student.id">
                      {{ student.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="task-priority">Priority</label>
                  <select id="task-priority" class="form-control">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="task-title">Task Title</label>
                <input type="text" id="task-title" class="form-control" placeholder="Enter task title...">
              </div>
              <div class="form-group">
                <label for="task-description">Description</label>
                <textarea id="task-description" class="form-control" rows="3" 
                          placeholder="Describe the task requirements..."></textarea>
              </div>
              <div class="form-group">
                <label for="task-deadline">Deadline</label>
                <input type="date" id="task-deadline" class="form-control">
              </div>
              <button class="assign-btn" (click)="assignTask()">
                <i class="fas fa-paper-plane"></i> Assign Task
              </button>
            </div>
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
    .students-section,
    .topics-section,
    .tracking-section,
    .tasks-section {
      margin-bottom: 3rem;
    }

    .students-section h2,
    .topics-section h2,
    .tracking-section h2,
    .tasks-section h2 {
      color: var(--text-main);
      margin-bottom: 2rem;
      font-size: 1.5rem;
      font-weight: 600;
    }

    /* Students Grid */
    .students-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .student-card {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
      transition: var(--transition);
    }

    .student-card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow-xl);
    }

    .student-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .student-avatar {
      width: 50px;
      height: 50px;
      background: var(--primary-color);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      flex-shrink: 0;
    }

    .student-info {
      flex: 1;
    }

    .student-info h3 {
      color: var(--text-main);
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .student-info p {
      color: var(--text-muted);
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
    }

    .internship-badge {
      background: var(--accent-color);
      color: var(--text-main);
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .student-status {
      flex-shrink: 0;
    }

    .status-badge {
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-active {
      background: var(--success);
      color: var(--white);
    }

    .status-inactive {
      background: var(--text-muted);
      color: var(--white);
    }

    .status-pending {
      background: var(--warning);
      color: var(--white);
    }

    .student-progress {
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }

    .progress-item {
      text-align: center;
    }

    .progress-item span:first-child {
      display: block;
      color: var(--text-muted);
      font-size: 0.8rem;
      margin-bottom: 0.5rem;
    }

    .progress-bar {
      width: 60px;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
      margin: 0.5rem auto;
    }

    .progress-fill {
      height: 100%;
      background: var(--success);
      transition: width 0.3s ease;
    }

    .progress-text {
      display: block;
      color: var(--text-main);
      font-weight: 600;
      font-size: 0.9rem;
    }

    .student-actions {
      padding: 1rem 1.5rem;
      display: flex;
      gap: 0.5rem;
      border-top: 1px solid #e5e7eb;
    }

    .action-btn-small {
      background: var(--primary-color);
      color: var(--white);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.9rem;
      font-weight: 500;
      transition: var(--transition);
    }

    .action-btn-small:hover {
      background: var(--secondary-color);
    }

    /* Topics Section */
    .topics-container {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .topics-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .topics-header h3 {
      color: var(--text-main);
      margin: 0;
    }

    .refresh-btn {
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

    .refresh-btn:hover {
      background: var(--secondary-color);
    }

    .topics-list {
      padding: 1.5rem;
    }

    .topic-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      transition: var(--transition);
    }

    .topic-item:hover {
      border-color: var(--primary-color);
      box-shadow: var(--shadow-sm);
    }

    .topic-content {
      flex: 1;
    }

    .topic-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .topic-header h4 {
      color: var(--text-main);
      margin: 0;
      font-size: 1.1rem;
    }

    .topic-date {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .topic-description {
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .topic-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .topic-meta span {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .topic-status {
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .status-pending {
      background: var(--warning);
      color: var(--white);
    }

    .status-approved {
      background: var(--success);
      color: var(--white);
    }

    .status-rejected {
      background: var(--error);
      color: var(--white);
    }

    .topic-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .approve-btn {
      background: var(--success);
      color: var(--white);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.9rem;
      font-weight: 500;
      transition: var(--transition);
    }

    .reject-btn {
      background: var(--error);
      color: var(--white);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.9rem;
      font-weight: 500;
      transition: var(--transition);
    }

    .review-btn {
      background: var(--warning);
      color: var(--white);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.9rem;
      font-weight: 500;
      transition: var(--transition);
    }

    /* Tracking Section */
    .tracking-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .tracking-card {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .tracking-header {
      background: var(--primary-color);
      color: var(--white);
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .tracking-header i {
      font-size: 1.5rem;
    }

    .tracking-header h3 {
      margin: 0;
      font-size: 1.1rem;
    }

    .tracking-stats {
      padding: 1.5rem;
      display: flex;
      justify-content: space-around;
    }

    .stat {
      text-align: center;
    }

    .stat-number {
      display: block;
      color: var(--text-main);
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .stat-label {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .activity-list {
      padding: 1.5rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .activity-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1rem;
      background: #f9fafb;
      transition: var(--transition);
    }

    .activity-item:hover {
      background: #f3f4f6;
    }

    .activity-icon {
      width: 40px;
      height: 40px;
      background: var(--secondary-color);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      flex-shrink: 0;
    }

    .activity-content {
      flex: 1;
    }

    .activity-content h4 {
      color: var(--text-main);
      margin-bottom: 0.5rem;
      font-size: 1rem;
    }

    .activity-content p {
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      font-size: 0.9rem;
    }

    .activity-time {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    /* Task Assignment */
    .task-assignment {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .assignment-form {
      padding: 2rem;
    }

    .assignment-form h3 {
      color: var(--text-main);
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
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

    .assign-btn {
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
      margin: 0 auto;
    }

    .assign-btn:hover {
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

      .students-grid,
      .tracking-grid {
        grid-template-columns: 1fr;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .topic-item {
        flex-direction: column;
      }

      .topic-actions {
        flex-direction: row;
        justify-content: flex-start;
      }
    }
  `]
})
export class TeacherDashboard implements OnInit {
  currentUser$: Observable<User | null>;
  userName$: Observable<string>;
  welcomeMessage$: Observable<string>;
  students$: Observable<any[]>;
  pendingTopics$: Observable<any[]>;
  trackingStats$: Observable<any>;
  recentActivities$: Observable<any[]>;

  constructor(
    private authService: AuthService,
    public router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.userName$ = this.currentUser$.pipe(
      map(user => user ? `${user.prenom} ${user.nom}` : 'Teacher')
    );
    this.welcomeMessage$ = this.currentUser$.pipe(
      map(user => user ? `Welcome back, ${user.prenom}! Manage your students and track their progress.` : 'Welcome to the Teacher Portal')
    );
    this.students$ = this.initializeStudents();
    this.pendingTopics$ = this.initializePendingTopics();
    this.trackingStats$ = this.initializeTrackingStats();
    this.recentActivities$ = this.initializeRecentActivities();
  }

  ngOnInit(): void {}

  private initializeStudents(): Observable<any[]> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next([
          {
            id: 1,
            name: 'Ahmed Ben Ali',
            email: 'ahmed.benali@email.com',
            internship: 'Software Development',
            status: 'active',
            progress: 75,
            lastActivity: '2 hours ago'
          },
          {
            id: 2,
            name: 'Sarah Trabelsi',
            email: 'sarah.trabelsi@email.com',
            internship: 'Data Science',
            status: 'active',
            progress: 60,
            lastActivity: '1 day ago'
          },
          {
            id: 3,
            name: 'Mohamed Karim',
            email: 'mohamed.karim@email.com',
            internship: 'Web Development',
            status: 'pending',
            progress: 30,
            lastActivity: '3 days ago'
          }
        ]);
        observer.complete();
      }, 500);
    });
  }

  private initializePendingTopics(): Observable<any[]> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next([
          {
            id: 1,
            title: 'AI-Powered Student Management System',
            description: 'Development of an intelligent system to manage student internships and track progress using machine learning algorithms.',
            student: 'Ahmed Ben Ali',
            company: 'Tech Corp',
            submissionDate: '2024-04-01',
            status: 'pending'
          },
          {
            id: 2,
            title: 'Mobile App for Campus Services',
            description: 'Creation of a mobile application to provide various campus services to students and staff.',
            student: 'Sarah Trabelsi',
            company: 'Digital Solutions',
            submissionDate: '2024-03-28',
            status: 'pending'
          }
        ]);
        observer.complete();
      }, 500);
    });
  }

  private initializeTrackingStats(): Observable<any> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          averageProgress: 75,
          completedInternships: 12,
          activeInternships: 8
        });
        observer.complete();
      }, 500);
    });
  }

  private initializeRecentActivities(): Observable<any[]> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next([
          {
            title: 'Topic Approved',
            description: 'Approved internship topic for Ahmed Ben Ali',
            icon: 'check',
            time: '2 hours ago'
          },
          {
            title: 'Progress Update',
            description: 'Sarah Trabelsi submitted weekly progress',
            icon: 'file-alt',
            time: '5 hours ago'
          },
          {
            title: 'Task Assigned',
            description: 'New task assigned to Mohamed Karim',
            icon: 'tasks',
            time: '1 day ago'
          }
        ]);
        observer.complete();
      }, 500);
    });
  }

  refreshTopics(): void {
    console.log('Refreshing pending topics...');
  }

  approveTopic(topic: any): void {
    console.log('Approving topic:', topic);
  }

  rejectTopic(topic: any): void {
    console.log('Rejecting topic:', topic);
  }

  requestChanges(topic: any): void {
    console.log('Requesting changes for topic:', topic);
  }

  viewStudentDetails(student: any): void {
    console.log('Viewing details for student:', student);
  }

  evaluateStudent(student: any): void {
    console.log('Evaluating student:', student);
  }

  assignTask(): void {
    console.log('Assigning new task...');
  }

  logout(): void {
    this.authService.logout();
  }
}
