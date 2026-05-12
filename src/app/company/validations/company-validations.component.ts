import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CompanyValidationItem } from '../../services/company/company.models';
import { CompanyValidationsService } from '../../services/company/company-validations.service';

@Component({
  selector: 'app-company-validations-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './company-validations.component.html',
  styleUrls: ['../company-shared.css'],
  styles: [`
    .validation-layout {
      display: grid;
      grid-template-columns: minmax(0, 1.5fr) minmax(320px, 1fr);
      gap: 24px;
      align-items: start;
    }

    .table-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .detail-copy {
      display: grid;
      gap: 14px;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .detail-item {
      padding: 12px 14px;
      border: 1px solid rgba(15, 23, 42, 0.08);
      border-radius: 14px;
      background: rgba(248, 250, 252, 0.9);
    }

    .detail-item .label {
      display: block;
      font-size: 0.78rem;
      color: #64748b;
      margin-bottom: 4px;
    }

    .detail-item .value {
      font-weight: 700;
      color: #0f172a;
    }

    .detail-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .comment-box {
      min-height: 120px;
      resize: vertical;
    }

    @media (max-width: 1100px) {
      .validation-layout {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class CompanyValidationsPageComponent implements OnInit {
  items: CompanyValidationItem[] = [];
  selectedItem: CompanyValidationItem | null = null;
  refusalComment = '';
  isLoading = false;
  isActing = false;
  errorMessage = '';
  successMessage = '';

  constructor(private companyValidationsService: CompanyValidationsService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  get pendingItems(): CompanyValidationItem[] {
    return this.items.filter((item) => item.pending);
  }

  get validatedCount(): number {
    return this.items.filter((item) => item.status === 'VALIDEE').length;
  }

  get refusedCount(): number {
    return this.items.filter((item) => item.status === 'REFUSEE').length;
  }

  loadItems(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyValidationsService.list().subscribe({
      next: (items) => {
        this.items = items;
        this.selectedItem = this.pickNextSelection(items);
        this.refusalComment = '';
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de charger les validations.');
        this.isLoading = false;
      }
    });
  }

  selectItem(item: CompanyValidationItem): void {
    this.selectedItem = item;
    this.refusalComment = '';
    this.successMessage = '';
    this.errorMessage = '';
  }

  approveSelected(item: CompanyValidationItem | null = this.selectedItem): void {
    if (!item) return;

    this.isActing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyValidationsService.approve(item).subscribe({
      next: (updated) => {
        this.upsertItem(updated);
        this.selectedItem = updated;
        this.successMessage = `${updated.title} validé avec succès.`;
        this.isActing = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de valider cet élément.');
        this.isActing = false;
      }
    });
  }

  rejectSelected(item: CompanyValidationItem | null = this.selectedItem): void {
    if (!item) return;
    if (!this.refusalComment.trim()) {
      this.errorMessage = 'Le motif du refus est obligatoire.';
      return;
    }

    this.isActing = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.companyValidationsService.reject(item, this.refusalComment).subscribe({
      next: (updated) => {
        this.upsertItem(updated);
        this.selectedItem = updated;
        this.successMessage = `${updated.title} refusé avec succès.`;
        this.refusalComment = '';
        this.isActing = false;
      },
      error: (error) => {
        this.errorMessage = this.extractErrorMessage(error, 'Impossible de refuser cet élément.');
        this.isActing = false;
      }
    });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'VALIDEE': return 'Validé';
      case 'REFUSEE': return 'Refusé';
      default: return 'En attente';
    }
  }

  private upsertItem(updated: CompanyValidationItem): void {
    const index = this.items.findIndex((item) => item.key === updated.key);
    if (index >= 0) {
      const nextItems = [...this.items];
      nextItems[index] = updated;
      this.items = nextItems;
    } else {
      this.items = [updated, ...this.items];
    }
  }

  private pickNextSelection(items: CompanyValidationItem[]): CompanyValidationItem | null {
    const currentKey = this.selectedItem?.key;
    return items.find((item) => item.key === currentKey)
      ?? items.find((item) => item.pending)
      ?? items[0]
      ?? null;
  }

  private extractErrorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string' && error.error.trim()) return error.error;
    if (typeof error?.error?.message === 'string' && error.error.message.trim()) return error.error.message;
    if (typeof error?.message === 'string' && error.message.trim()) return error.message;
    return fallback;
  }
}
