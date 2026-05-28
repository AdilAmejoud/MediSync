import { Directive, ElementRef, AfterViewInit } from '@angular/core';

@Directive({
  selector: '[msAutoFocus]',
  standalone: true
})
export class AutoFocusDirective implements AfterViewInit {
  constructor(private host: ElementRef) {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.host.nativeElement.focus();
    }, 100);
  }
}
