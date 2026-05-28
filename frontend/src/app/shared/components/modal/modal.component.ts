import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'ms-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, ClickOutsideDirective],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss'
})
export class ModalComponent {
  @Input() visible: boolean = false;
  @Input() title: string = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() close = new EventEmitter<void>();
}
