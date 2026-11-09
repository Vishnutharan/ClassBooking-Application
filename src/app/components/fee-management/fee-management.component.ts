import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeePayment } from '../../core/models/admin.models';
import { PaymentIntegrationService } from '../../core/services/payment-integration.service';
import { PaymentRecord } from '../../core/models/payment.models';
import { NotificationService } from '../../core/services/notification.service';

@Component({
    selector: 'app-fee-management',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './fee-management.component.html',
    styleUrls: ['./fee-management.component.css']
})
export class FeeManagementComponent implements OnInit {
    private paymentService = inject(PaymentIntegrationService);
    private notificationService = inject(NotificationService);

    payments: FeePayment[] = [];
    filteredPayments: FeePayment[] = [];
    searchTerm: string = '';

    // Form model
    newPayment: Partial<FeePayment> = {
        type: 'Monthly Fee',
        status: 'Paid',
        year: new Date().getFullYear(),
        month: new Date().toLocaleString('default', { month: 'long' })
    };

    showAddModal: boolean = false;

    ngOnInit(): void {
        this.loadPayments();
    }

    loadPayments() {
        this.paymentService.getAdminPayments().subscribe({
            next: (records) => {
                this.payments = (records || []).map(r => this.mapRecordToFeePayment(r));
                this.filteredPayments = [...this.payments];
            },
            error: () => {
                this.notificationService.showError('Failed to load payments. Showing cached/manual entries.');
                this.filteredPayments = [...this.payments];
            }
        });
    }

    private mapRecordToFeePayment(record: PaymentRecord): FeePayment {
        const date = record.sessionDate ? new Date(record.sessionDate) : new Date(record.createdAt);
        const month = date.toLocaleString('default', { month: 'long' });
        const status = record.paymentStatus?.toLowerCase() === 'paid' ? 'Paid' : 'Pending';

        return {
            id: record.id,
            studentId: record.studentId || 'N/A',
            studentName: record.studentName || 'Student',
            amount: record.amount || 0,
            month,
            year: date.getFullYear(),
            date,
            status: status as any,
            type: record.paymentMethod ? `${record.paymentMethod} Payment` as any : 'Monthly Fee'
        };
    }

    filterPayments() {
        if (!this.searchTerm) {
            this.filteredPayments = [...this.payments];
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredPayments = this.payments.filter(p =>
                p.studentName.toLowerCase().includes(term) ||
                p.studentId.toLowerCase().includes(term)
            );
        }
    }

    openAddModal() {
        this.showAddModal = true;
    }

    closeAddModal() {
        this.showAddModal = false;
        // Reset form
        this.newPayment = {
            type: 'Monthly Fee',
            status: 'Paid',
            year: new Date().getFullYear(),
            month: new Date().toLocaleString('default', { month: 'long' })
        };
    }

    savePayment() {
        if (this.newPayment.studentName && this.newPayment.amount) {
            const payment: FeePayment = {
                id: `PAY-${Date.now()}`,
                studentId: this.newPayment.studentId || 'ST-TEMP',
                studentName: this.newPayment.studentName,
                amount: this.newPayment.amount,
                month: this.newPayment.month || 'Current',
                year: this.newPayment.year || 2023,
                date: new Date(),
                status: this.newPayment.status as any,
                type: this.newPayment.type as any
            };

            this.payments.unshift(payment);
            this.filterPayments();
            this.closeAddModal();
        }
    }

    printReceipt(payment: FeePayment) {
        console.log('Printing receipt for', payment.id);
        alert(`Receipt generated for ${payment.studentName} - £${payment.amount}`);
    }
}
