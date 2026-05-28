import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

@Component({
  selector: 'ms-side-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, ClickOutsideDirective],
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.scss'
})
export class SidePanelComponent {
  @Input() visible: boolean = false;
  @Input() title: string = '';
  @Output() close = new EventEmitter<void>();
}
