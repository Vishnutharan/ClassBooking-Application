import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FeePayment } from '../../core/models/admin.models';
import { PaymentIntegrationService } from '../../core/services/payment-integration.service';
import { PaymentRecord } from '../../core/models/payment.models';
import { NotificationService } from '../../core/services/notification.service';

const UK_DEMO_FEE_PAYMENTS: FeePayment[] = [
    {
        id: 'UK-INV-2026-101',
        studentId: 'UK-STU-101',
        studentName: 'Oliver Thompson (Year 11 GCSE)',
        amount: 180,
        month: 'November',
        year: 2026,
        date: new Date(Date.now() - 2 * 86400000),
        status: 'Paid',
        type: 'Monthly Fee'
    },
    {
        id: 'UK-INV-2026-102',
        studentId: 'UK-STU-102',
        studentName: 'Amelia Clarke (Year 13 A-Level)',
        amount: 200,
        month: 'November',
        year: 2026,
        date: new Date(Date.now() - 5 * 86400000),
        status: 'Paid',
        type: 'Monthly Fee'
    },
    {
        id: 'UK-INV-2026-103',
        studentId: 'UK-STU-103',
        studentName: 'Harry Patel (Year 10 GCSE)',
        amount: 90,
        month: 'November',
        year: 2026,
        date: new Date(Date.now() - 7 * 86400000),
        status: 'Pending',
        type: 'Exam Fee'
    },
    {
        id: 'UK-INV-2026-104',
        studentId: 'UK-STU-104',
        studentName: 'Isla MacLeod (Year 12 A-Level)',
        amount: 160,
        month: 'October',
        year: 2026,
        date: new Date(Date.now() - 14 * 86400000),
        status: 'Paid',
        type: 'Monthly Fee'
    }
];

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
    selectedReceiptPayment: FeePayment | null = null;

    newPayment: Partial<FeePayment> = {
        type: 'Monthly Fee',
        status: 'Paid',
        year: new Date().getFullYear(),
        month: new Date().toLocaleString('en-GB', { month: 'long' })
    };

    showAddModal: boolean = false;

    ngOnInit(): void {
        this.loadPayments();
    }

    loadPayments() {
        this.paymentService.getAdminPayments().subscribe({
            next: (records) => {
                const mapped = (records || []).map(r => this.mapRecordToFeePayment(r));
                this.payments = mapped.length > 0 ? mapped : [...UK_DEMO_FEE_PAYMENTS];
                this.filteredPayments = [...this.payments];
            },
            error: () => {
                this.payments = [...UK_DEMO_FEE_PAYMENTS];
                this.filteredPayments = [...this.payments];
            }
        });
    }

    private mapRecordToFeePayment(record: PaymentRecord): FeePayment {
        const date = record.sessionDate ? new Date(record.sessionDate) : new Date(record.createdAt);
        const month = date.toLocaleString('en-GB', { month: 'long' });
        const status = record.paymentStatus?.toLowerCase() === 'paid' ? 'Paid' : 'Pending';

        return {
            id: record.id,
            studentId: record.studentId || 'UK-STU',
            studentName: record.studentName || 'UK Student',
            amount: record.amount || 45,
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
        this.newPayment = {
            type: 'Monthly Fee',
            status: 'Paid',
            year: new Date().getFullYear(),
            month: new Date().toLocaleString('en-GB', { month: 'long' })
        };
    }

    savePayment() {
        if (this.newPayment.studentName && this.newPayment.amount) {
            const payment: FeePayment = {
                id: `UK-INV-${Date.now().toString().slice(-5)}`,
                studentId: this.newPayment.studentId || 'UK-STU-NEW',
                studentName: this.newPayment.studentName,
                amount: this.newPayment.amount,
                month: this.newPayment.month || 'November',
                year: this.newPayment.year || 2026,
                date: new Date(),
                status: this.newPayment.status as any,
                type: this.newPayment.type as any
            };

            this.payments.unshift(payment);
            this.filterPayments();
            this.notificationService.showSuccess('UK GBP Fee Payment recorded successfully');
            this.closeAddModal();
        }
    }

    printReceipt(payment: FeePayment) {
        this.selectedReceiptPayment = payment;
    }

    closeReceiptModal() {
        this.selectedReceiptPayment = null;
    }
}
