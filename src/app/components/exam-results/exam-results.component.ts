import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExamResult } from '../../core/models/admin.models';

@Component({
    selector: 'app-exam-results',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './exam-results.component.html',
    styleUrls: ['./exam-results.component.css']
})
export class ExamResultsComponent implements OnInit {
    results: ExamResult[] = [];
    filteredResults: ExamResult[] = [];
    searchTerm: string = '';

    // Form model
    newResult: Partial<ExamResult> = {
        examName: 'GCSE Mock Assessment',
        subject: 'Mathematics',
        date: new Date()
    };

    showAddModal: boolean = false;

    ngOnInit(): void {
        this.loadDemoData();
    }

    loadDemoData() {
        // UK National Curriculum Assessment demo data
        this.results = [
            {
                id: 'RES-001',
                studentId: 'ST-2023001',
                studentName: 'Oliver Smith',
                examName: 'GCSE Mock Assessment',
                subject: 'Mathematics',
                marks: 85,
                grade: 'A',
                rank: 1,
                date: new Date('2023-09-15')
            },
            {
                id: 'RES-002',
                studentId: 'ST-2023002',
                studentName: 'Amelia Jones',
                examName: 'GCSE Mock Assessment',
                subject: 'Mathematics',
                marks: 78,
                grade: 'A',
                rank: 2,
                date: new Date('2023-09-15')
            },
            {
                id: 'RES-003',
                studentId: 'ST-2023003',
                studentName: 'Harry Wilson',
                examName: 'GCSE Mock Assessment',
                subject: 'Mathematics',
                marks: 65,
                grade: 'B',
                rank: 5,
                date: new Date('2023-09-15')
            },
            {
                id: 'RES-004',
                studentId: 'ST-2023001',
                studentName: 'Oliver Smith',
                examName: 'GCSE Mock Assessment',
                subject: 'Science',
                marks: 92,
                grade: 'A',
                rank: 1,
                date: new Date('2023-09-18')
            }
        ];
        this.filteredResults = [...this.results];
    }

    filterResults() {
        if (!this.searchTerm) {
            this.filteredResults = [...this.results];
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredResults = this.results.filter(r =>
                r.studentName.toLowerCase().includes(term) ||
                r.studentId.toLowerCase().includes(term) ||
                r.subject.toLowerCase().includes(term)
            );
        }
    }

    openAddModal() {
        this.showAddModal = true;
    }

    closeAddModal() {
        this.showAddModal = false;
        this.newResult = {
            examName: 'GCSE Mock Assessment',
            subject: 'Mathematics',
            date: new Date()
        };
    }

    saveResult() {
        if (this.newResult.studentName && this.newResult.marks !== undefined) {
            const marks = this.newResult.marks;
            let grade = 'F';
            if (marks >= 75) grade = 'A';
            else if (marks >= 65) grade = 'B';
            else if (marks >= 55) grade = 'C';
            else if (marks >= 35) grade = 'S';

            const result: ExamResult = {
                id: `RES-${Date.now()}`,
                studentId: this.newResult.studentId || 'ST-TEMP',
                studentName: this.newResult.studentName,
                examName: this.newResult.examName || 'Term Test',
                subject: this.newResult.subject || 'General',
                marks: marks,
                grade: grade,
                rank: 0, // Rank calculation logic would be complex, skipping for demo
                date: new Date()
            };

            this.results.unshift(result);
            this.filterResults();
            this.closeAddModal();
        }
    }
}
