import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService, UserRole, User } from '../../services/auth.service';

@Component({
  selector: 'app-company-dashboard',
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
          <i class="fas fa-building"></i>
          <span>Company Portal</span>
        </div>
        <div class="nav-menu">
          <a class="nav-link" (click)="router.navigate(['/company/dashboard'])">
            <i class="fas fa-tachometer-alt"></i> Dashboard
          </a>
          <a class="nav-link" (click)="router.navigate(['/company/topics'])">
            <i class="fas fa-briefcase"></i> Internship Topics
          </a>
          <a class="nav-link" (click)="router.navigate(['/company/students'])">
            <i class="fas fa-user-graduate"></i> Assigned Students
          </a>
          <a class="nav-link" (click)="router.navigate(['/company/evaluations'])">
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
              <i class="fas fa-building"></i>
              Company Dashboard
            </h1>
            <p>{{ welcomeMessage$ | async }}</p>
          </div>
        </div>

        <!-- Company Stats -->
        <div class="stats-section">
          <h2>Company Overview</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-briefcase"></i>
              </div>
              <div class="stat-content">
                <h3>{{ (companyStats$ | async)?.activeTopics || 8 }}</h3>
                <p>Active Topics</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-user-graduate"></i>
              </div>
              <div class="stat-content">
                <h3>{{ (companyStats$ | async)?.assignedStudents || 12 }}</h3>
                <p>Assigned Students</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-chart-line"></i>
              </div>
              <div class="stat-content">
                <h3>{{ (companyStats$ | async)?.completionRate || 85 }}%</h3>
                <p>Completion Rate</p>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon">
                <i class="fas fa-star"></i>
              </div>
              <div class="stat-content">
                <h3>{{ (companyStats$ | async)?.averageRating || 4.2 }}</h3>
                <p>Average Rating</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Internship Topics Management -->
        <div class="topics-section">
          <h2>Internship Topics</h2>
          <div class="topics-container">
            <div class="topics-header">
              <h3>Manage Internship Opportunities</h3>
              <button class="add-topic-btn" (click)="showAddTopicForm = !showAddTopicForm">
                <i class="fas fa-plus"></i> Add New Topic
              </button>
            </div>
            
            <!-- Add Topic Form -->
            <div class="add-topic-form" *ngIf="showAddTopicForm">
              <div class="form-grid">
                <div class="form-group">
                  <label for="topic-title">Topic Title</label>
                  <input type="text" id="topic-title" class="form-control" 
                         placeholder="Enter internship topic title..." [(ngModel)]="newTopic.title">
                </div>
                <div class="form-group">
                  <label for="topic-duration">Duration</label>
                  <select id="topic-duration" class="form-control" [(ngModel)]="newTopic.duration">
                    <option value="1">1 month</option>
                    <option value="2">2 months</option>
                    <option value="3">3 months</option>
                    <option value="4">4 months</option>
                    <option value="6">6 months</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="topic-skills">Required Skills</label>
                  <input type="text" id="topic-skills" class="form-control" 
                         placeholder="e.g., JavaScript, Python, React..." [(ngModel)]="newTopic.skills">
                </div>
                <div class="form-group">
                  <label for="topic-positions">Available Positions</label>
                  <input type="number" id="topic-positions" class="form-control" 
                         placeholder="Number of available positions" [(ngModel)]="newTopic.positions">
                </div>
              </div>
              <div class="form-group full-width">
                <label for="topic-description">Description</label>
                <textarea id="topic-description" class="form-control" rows="4" 
                          placeholder="Describe the internship role, responsibilities, and requirements..." 
                          [(ngModel)]="newTopic.description"></textarea>
              </div>
              <div class="form-actions">
                <button class="submit-btn" (click)="submitTopic()">
                  <i class="fas fa-paper-plane"></i> Publish Topic
                </button>
                <button class="cancel-btn" (click)="showAddTopicForm = false">
                  <i class="fas fa-times"></i> Cancel
                </button>
              </div>
            </div>

            <!-- Existing Topics -->
            <div class="topics-list">
              <div class="topic-card" *ngFor="let topic of (topics$ | async)">
                <div class="topic-header">
                  <div class="topic-info">
                    <h4>{{ topic.title }}</h4>
                    <div class="topic-meta">
                      <span class="duration-badge">{{ topic.duration }} months</span>
                      <span class="positions-badge">{{ topic.positions }} positions</span>
                      <span class="status-badge status-{{ topic.status }}">{{ topic.status }}</span>
                    </div>
                  </div>
                  <div class="topic-actions">
                    <button class="action-btn-small edit-btn" (click)="editTopic(topic)">
                      <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn-small delete-btn" (click)="deleteTopic(topic)">
                      <i class="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                <div class="topic-description">
                  <p>{{ topic.description }}</p>
                  <div class="topic-skills">
                    <span class="skill-tag" *ngFor="let skill of topic.skills">{{ skill }}</span>
                  </div>
                </div>
                <div class="topic-stats">
                  <div class="stat-item">
                    <i class="fas fa-users"></i>
                    <span>{{ topic.applications }} applications</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-user-check"></i>
                    <span>{{ topic.assigned }} assigned</span>
                  </div>
                  <div class="stat-item">
                    <i class="fas fa-calendar"></i>
                    <span>Posted {{ topic.postedDate }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Student Assignment -->
        <div class="students-section">
          <h2>Assigned Students</h2>
          <div class="students-container">
            <div class="assignment-header">
              <h3>Current Interns</h3>
              <div class="filter-controls">
                <select class="form-control" [(ngModel)]="studentFilter">
                  <option value="all">All Students</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
            <div class="students-grid">
              <div class="student-card" *ngFor="let student of (filteredStudents$ | async)">
                <div class="student-header">
                  <div class="student-avatar">
                    <i class="fas fa-user-graduate"></i>
                  </div>
                  <div class="student-info">
                    <h4>{{ student.name }}</h4>
                    <p>{{ student.email }}</p>
                    <span class="topic-badge">{{ student.topic }}</span>
                  </div>
                  <div class="student-status">
                    <span class="status-badge status-{{ student.status }}">{{ student.status }}</span>
                  </div>
                </div>
                <div class="student-details">
                  <div class="detail-row">
                    <span class="label">Start Date:</span>
                    <span class="value">{{ student.startDate }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Progress:</span>
                    <div class="progress-bar">
                      <div class="progress-fill" [style.width.%]="student.progress"></div>
                    </div>
                    <span class="progress-text">{{ student.progress }}%</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Supervisor:</span>
                    <span class="value">{{ student.supervisor }}</span>
                  </div>
                </div>
                <div class="student-actions">
                  <button class="action-btn-small" (click)="viewStudentProfile(student)">
                    <i class="fas fa-user"></i> Profile
                  </button>
                  <button class="action-btn-small" (click)="trackProgress(student)">
                    <i class="fas fa-chart-line"></i> Progress
                  </button>
                  <button class="action-btn-small" (click)="evaluateStudent(student)">
                    <i class="fas fa-clipboard-check"></i> Evaluate
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Progress Tracking -->
        <div class="tracking-section">
          <h2>Progress Tracking</h2>
          <div class="tracking-container">
            <div class="tracking-header">
              <h3>Overall Performance</h3>
              <button class="export-btn" (click)="exportReport()">
                <i class="fas fa-download"></i> Export Report
              </button>
            </div>
            <div class="performance-grid">
              <div class="performance-card">
                <div class="perf-header">
                  <i class="fas fa-chart-pie"></i>
                  <h4>Completion Statistics</h4>
                </div>
                <div class="perf-stats">
                  <div class="perf-stat">
                    <span class="perf-number">{{ (performanceStats$ | async)?.completed || 15 }}</span>
                    <span class="perf-label">Completed</span>
                  </div>
                  <div class="perf-stat">
                    <span class="perf-number">{{ (performanceStats$ | async)?.inProgress || 8 }}</span>
                    <span class="perf-label">In Progress</span>
                  </div>
                  <div class="perf-stat">
                    <span class="perf-number">{{ (performanceStats$ | async)?.dropped || 2 }}</span>
                    <span class="perf-label">Dropped</span>
                  </div>
                </div>
              </div>
              <div class="performance-card">
                <div class="perf-header">
                  <i class="fas fa-star"></i>
                  <h4>Quality Metrics</h4>
                </div>
                <div class="perf-stats">
                  <div class="perf-stat">
                    <span class="perf-number">{{ (performanceStats$ | async)?.avgRating || 4.1 }}</span>
                    <span class="perf-label">Avg Rating</span>
                  </div>
                  <div class="perf-stat">
                    <span class="perf-number">{{ (performanceStats$ | async)?.satisfaction || 92 }}%</span>
                    <span class="perf-label">Satisfaction</span>
                  </div>
                  <div class="perf-stat">
                    <span class="perf-number">{{ (performanceStats$ | async)?.retention || 78 }}%</span>
                    <span class="perf-label">Retention</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Feedback Section -->
        <div class="feedback-section">
          <h2>Student Feedback & Evaluations</h2>
          <div class="feedback-container">
            <div class="feedback-header">
              <h3>Recent Evaluations</h3>
              <button class="add-evaluation-btn" (click)="showEvaluationForm = !showEvaluationForm">
                <i class="fas fa-plus"></i> Add Evaluation
              </button>
            </div>

            <!-- Evaluation Form -->
            <div class="evaluation-form" *ngIf="showEvaluationForm">
              <h4>Submit Student Evaluation</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label for="eval-student">Student</label>
                  <select id="eval-student" class="form-control" [(ngModel)]="evaluation.studentId">
                    <option value="">Select student...</option>
                    <option *ngFor="let student of (students$ | async)" [value]="student.id">
                      {{ student.name }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="eval-period">Evaluation Period</label>
                  <select id="eval-period" class="form-control" [(ngModel)]="evaluation.period">
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="midterm">Mid-term</option>
                    <option value="final">Final</option>
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label for="eval-rating">Overall Rating</label>
                <div class="rating-container">
                  <span class="rating-star" *ngFor="let star of [1,2,3,4,5]" 
                        (click)="evaluation.rating = star" 
                        [class.active]="star <= evaluation.rating">
                    <i class="fas fa-star"></i>
                  </span>
                </div>
              </div>
              <div class="form-group">
                <label for="eval-feedback">Feedback</label>
                <textarea id="eval-feedback" class="form-control" rows="4" 
                          placeholder="Provide detailed feedback about student performance..." 
                          [(ngModel)]="evaluation.feedback"></textarea>
              </div>
              <div class="form-actions">
                <button class="submit-btn" (click)="submitEvaluation()">
                  <i class="fas fa-paper-plane"></i> Submit Evaluation
                </button>
                <button class="cancel-btn" (click)="showEvaluationForm = false">
                  <i class="fas fa-times"></i> Cancel
                </button>
              </div>
            </div>

            <!-- Recent Evaluations -->
            <div class="evaluations-list">
              <div class="evaluation-item" *ngFor="let eval of (evaluations$ | async)">
                <div class="eval-header">
                  <div class="eval-student-info">
                    <h5>{{ eval.studentName }}</h5>
                    <span class="eval-period">{{ eval.period }}</span>
                  </div>
                  <div class="eval-rating">
                    <span class="rating-star" *ngFor="let star of [1,2,3,4,5]" [class.active]="star <= eval.rating">
                      <i class="fas fa-star"></i>
                    </span>
                  </div>
                </div>
                <div class="eval-content">
                  <p>{{ eval.feedback }}</p>
                  <div class="eval-meta">
                    <span><i class="fas fa-calendar"></i> {{ eval.date }}</span>
                    <span><i class="fas fa-user"></i> {{ eval.evaluator }}</span>
                  </div>
                </div>
              </div>
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
      border-left: 4px solid var(--primary-color);
    }

    .welcome-card h1 {
      color: var(--primary-color);
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
    .stats-section,
    .topics-section,
    .students-section,
    .tracking-section,
    .feedback-section {
      margin-bottom: 3rem;
    }

    .stats-section h2,
    .topics-section h2,
    .students-section h2,
    .tracking-section h2,
    .feedback-section h2 {
      color: var(--text-main);
      margin-bottom: 2rem;
      font-size: 1.5rem;
      font-weight: 600;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .stat-card {
      background: var(--white);
      padding: 2rem;
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      display: flex;
      align-items: center;
      gap: 1.5rem;
      transition: var(--transition);
      border-left: 4px solid var(--secondary-color);
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow-xl);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      background: var(--secondary-color);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--white);
      font-size: 1.5rem;
    }

    .stat-content h3 {
      font-size: 2rem;
      color: var(--text-main);
      margin-bottom: 0.5rem;
    }

    .stat-content p {
      color: var(--text-muted);
      margin: 0;
      font-weight: 500;
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

    .add-topic-btn {
      background: var(--success);
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

    .add-topic-btn:hover {
      background: #15803d;
      transform: translateY(-2px);
    }

    .add-topic-form {
      padding: 2rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
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

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    .submit-btn {
      background: var(--primary-color);
      color: var(--white);
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      transition: var(--transition);
    }

    .submit-btn:hover {
      background: var(--secondary-color);
      transform: translateY(-2px);
    }

    .cancel-btn {
      background: var(--text-muted);
      color: var(--white);
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      transition: var(--transition);
    }

    .cancel-btn:hover {
      background: var(--error);
    }

    .topics-list {
      padding: 1.5rem;
    }

    .topic-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      transition: var(--transition);
    }

    .topic-card:hover {
      border-color: var(--primary-color);
      box-shadow: var(--shadow-sm);
    }

    .topic-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .topic-info h4 {
      color: var(--text-main);
      margin-bottom: 0.5rem;
      font-size: 1.2rem;
    }

    .topic-meta {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .duration-badge,
    .positions-badge,
    .status-badge {
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .duration-badge {
      background: var(--primary-color);
      color: var(--white);
    }

    .positions-badge {
      background: var(--secondary-color);
      color: var(--white);
    }

    .status-active {
      background: var(--success);
      color: var(--white);
    }

    .status-closed {
      background: var(--text-muted);
      color: var(--white);
    }

    .topic-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn-small {
      background: var(--primary-color);
      color: var(--white);
      border: none;
      padding: 0.5rem 0.8rem;
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

    .edit-btn {
      background: var(--warning);
    }

    .delete-btn {
      background: var(--error);
    }

    .topic-description p {
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .topic-skills {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .skill-tag {
      background: var(--accent-color);
      color: var(--text-main);
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .topic-stats {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .stat-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Students Section */
    .students-container {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .assignment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .filter-controls {
      display: flex;
      align-items: center;
    }

    .students-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
      padding: 1.5rem;
    }

    .student-card {
      background: var(--white);
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      transition: var(--transition);
    }

    .student-card:hover {
      border-color: var(--primary-color);
      box-shadow: var(--shadow-sm);
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

    .student-info h4 {
      color: var(--text-main);
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .student-info p {
      color: var(--text-muted);
      margin: 0 0 0.5rem 0;
      font-size: 0.9rem;
    }

    .student-details {
      padding: 1rem 1.5rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .detail-row .label {
      color: var(--text-muted);
      font-weight: 500;
    }

    .detail-row .value {
      color: var(--text-main);
      font-weight: 600;
    }

    .progress-bar {
      width: 100px;
      height: 6px;
      background: #e5e7eb;
      border-radius: 3px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--success);
      transition: width 0.3s ease;
    }

    .progress-text {
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

    /* Tracking Section */
    .tracking-container {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .tracking-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .tracking-header h3 {
      color: var(--text-main);
      margin: 0;
    }

    .export-btn {
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

    .export-btn:hover {
      background: var(--secondary-color);
    }

    .performance-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      padding: 1.5rem;
    }

    .performance-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
    }

    .perf-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1.5rem;
      color: var(--primary-color);
    }

    .perf-header i {
      font-size: 1.5rem;
    }

    .perf-header h4 {
      margin: 0;
      font-size: 1.1rem;
    }

    .perf-stats {
      display: flex;
      justify-content: space-around;
    }

    .perf-stat {
      text-align: center;
    }

    .perf-number {
      display: block;
      color: var(--text-main);
      font-size: 1.8rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }

    .perf-label {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    /* Feedback Section */
    .feedback-container {
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-md);
      overflow: hidden;
    }

    .feedback-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .add-evaluation-btn {
      background: var(--success);
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

    .add-evaluation-btn:hover {
      background: #15803d;
      transform: translateY(-2px);
    }

    .evaluation-form {
      padding: 2rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .evaluation-form h4 {
      color: var(--text-main);
      margin-bottom: 1.5rem;
      text-align: center;
    }

    .rating-container {
      display: flex;
      gap: 0.5rem;
      font-size: 1.5rem;
    }

    .rating-star {
      cursor: pointer;
      color: #d1d5db;
      transition: var(--transition);
    }

    .rating-star:hover,
    .rating-star.active {
      color: var(--warning);
    }

    .evaluations-list {
      padding: 1.5rem;
    }

    .evaluation-item {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      transition: var(--transition);
    }

    .evaluation-item:hover {
      border-color: var(--primary-color);
      box-shadow: var(--shadow-sm);
    }

    .eval-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .eval-student-info h5 {
      color: var(--text-main);
      margin-bottom: 0.5rem;
    }

    .eval-period {
      background: var(--primary-color);
      color: var(--white);
      padding: 0.3rem 0.8rem;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 500;
    }

    .eval-content {
      margin-bottom: 1rem;
    }

    .eval-content p {
      color: var(--text-muted);
      line-height: 1.6;
      margin-bottom: 1rem;
    }

    .eval-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: var(--text-muted);
    }

    .eval-meta span {
      display: flex;
      align-items: center;
      gap: 0.3rem;
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

      .stats-grid,
      .students-grid,
      .performance-grid {
        grid-template-columns: 1fr;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .topic-header {
        flex-direction: column;
        gap: 1rem;
      }

      .topic-actions {
        justify-content: flex-start;
      }
    }
  `]
})
export class CompanyDashboard implements OnInit {
  currentUser$: Observable<User | null>;
  userName$: Observable<string>;
  welcomeMessage$: Observable<string>;
  companyStats$: Observable<any>;
  topics$: Observable<any[]>;
  students$: Observable<any[]>;
  performanceStats$: Observable<any>;
  evaluations$: Observable<any[]>;
  filteredStudents$: Observable<any[]>;

  showAddTopicForm = false;
  showEvaluationForm = false;
  studentFilter = 'all';

  newTopic = {
    title: '',
    duration: 3,
    skills: '',
    positions: 1,
    description: ''
  };

  evaluation = {
    studentId: '',
    period: 'monthly',
    rating: 0,
    feedback: ''
  };

  constructor(
    private authService: AuthService,
    public router: Router
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.userName$ = this.currentUser$.pipe(
      map(user => user ? `${user.prenom} ${user.nom}` : 'Company Manager')
    );
    this.welcomeMessage$ = this.currentUser$.pipe(
      map(user => user ? `Welcome back, ${user.prenom}! Manage your internship programs and track student progress.` : 'Welcome to the Company Portal')
    );
    this.companyStats$ = this.initializeCompanyStats();
    this.topics$ = this.initializeTopics();
    this.students$ = this.initializeStudents();
    this.performanceStats$ = this.initializePerformanceStats();
    this.evaluations$ = this.initializeEvaluations();
    this.filteredStudents$ = this.filteredStudents();
  }

  ngOnInit(): void {}

  private initializeCompanyStats(): Observable<any> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          activeTopics: 8,
          assignedStudents: 12,
          completionRate: 85,
          averageRating: 4.2
        });
        observer.complete();
      }, 500);
    });
  }

  private initializeTopics(): Observable<any[]> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next([
          {
            id: 1,
            title: 'Full-Stack Web Development',
            duration: 3,
            skills: ['JavaScript', 'React', 'Node.js', 'MongoDB'],
            positions: 2,
            description: 'Develop modern web applications using cutting-edge technologies.',
            status: 'active',
            applications: 15,
            assigned: 2,
            postedDate: '2 weeks ago'
          },
          {
            id: 2,
            title: 'Mobile App Development',
            duration: 4,
            skills: ['React Native', 'TypeScript', 'Firebase'],
            positions: 1,
            description: 'Create cross-platform mobile applications for iOS and Android.',
            status: 'active',
            applications: 8,
            assigned: 1,
            postedDate: '1 week ago'
          }
        ]);
        observer.complete();
      }, 500);
    });
  }

  private initializeStudents(): Observable<any[]> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next([
          {
            id: 1,
            name: 'Ahmed Ben Ali',
            email: 'ahmed.benali@email.com',
            topic: 'Full-Stack Web Development',
            status: 'active',
            progress: 75,
            startDate: '2024-01-15',
            supervisor: 'John Doe'
          },
          {
            id: 2,
            name: 'Sarah Trabelsi',
            email: 'sarah.trabelsi@email.com',
            topic: 'Mobile App Development',
            status: 'active',
            progress: 60,
            startDate: '2024-02-01',
            supervisor: 'Jane Smith'
          }
        ]);
        observer.complete();
      }, 500);
    });
  }

  private initializePerformanceStats(): Observable<any> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next({
          completed: 15,
          inProgress: 8,
          dropped: 2,
          avgRating: 4.1,
          satisfaction: 92,
          retention: 78
        });
        observer.complete();
      }, 500);
    });
  }

  private initializeEvaluations(): Observable<any[]> {
    return new Observable(observer => {
      setTimeout(() => {
        observer.next([
          {
            studentName: 'Ahmed Ben Ali',
            period: 'Monthly',
            rating: 4,
            feedback: 'Excellent progress on the full-stack project. Shows great problem-solving skills.',
            date: '2024-03-15',
            evaluator: 'John Doe'
          },
          {
            studentName: 'Sarah Trabelsi',
            period: 'Monthly',
            rating: 5,
            feedback: 'Outstanding performance on mobile app development. Exceeds expectations.',
            date: '2024-03-10',
            evaluator: 'Jane Smith'
          }
        ]);
        observer.complete();
      }, 500);
    });
  }

  private filteredStudents(): Observable<any[]> {
    return this.students$.pipe(
      map(students => {
        if (this.studentFilter === 'all') return students;
        return students.filter(student => student.status === this.studentFilter);
      })
    );
  }

  submitTopic(): void {
    console.log('Submitting new topic:', this.newTopic);
    this.showAddTopicForm = false;
    this.resetTopicForm();
  }

  editTopic(topic: any): void {
    console.log('Editing topic:', topic);
  }

  deleteTopic(topic: any): void {
    console.log('Deleting topic:', topic);
  }

  viewStudentProfile(student: any): void {
    console.log('Viewing profile for student:', student);
  }

  trackProgress(student: any): void {
    console.log('Tracking progress for student:', student);
  }

  evaluateStudent(student: any): void {
    this.evaluation.studentId = student.id;
    this.showEvaluationForm = true;
  }

  submitEvaluation(): void {
    console.log('Submitting evaluation:', this.evaluation);
    this.showEvaluationForm = false;
    this.resetEvaluationForm();
  }

  exportReport(): void {
    console.log('Exporting performance report...');
  }

  private resetTopicForm(): void {
    this.newTopic = {
      title: '',
      duration: 3,
      skills: '',
      positions: 1,
      description: ''
    };
  }

  private resetEvaluationForm(): void {
    this.evaluation = {
      studentId: '',
      period: 'monthly',
      rating: 0,
      feedback: ''
    };
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/connexion']);
  }
}
