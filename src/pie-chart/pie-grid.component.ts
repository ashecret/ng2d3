import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  OnDestroy,
  AfterViewInit,
  SimpleChanges,
  ElementRef,
  NgZone,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';

import d3 from '../d3';
import { calculateViewDimensions, ViewDimensions } from '../common/view-dimensions.helper';
import { colorHelper } from '../utils/color-sets';
import { BaseChartComponent } from '../common/base-chart.component';
import { trimLabel } from '../common/trim-label.helper';
import { gridLayout } from '../common/grid-layout.helper';
import { formatLabel } from '../common/label.helper';

@Component({
  selector: 'pie-grid',
  template: `
    <chart
      [legend]="false"
      (legendLabelClick)="onClick($event)"
      [view]="[width, height]">
      <svg:g [attr.transform]="transform" class="pie-grid chart">
        <svg:g
          *ngFor="let series of series"
          class="pie-grid-item"
          [attr.transform]="series.transform">
          <svg:g pieGridSeries
            [colors]="series.colors"
            [data]="series.data"
            [innerRadius]="series.innerRadius"
            [outerRadius]="series.outerRadius"
            (select)="onClick($event)"
            swui-tooltip
            [tooltipPlacement]="'top'"
            [tooltipType]="'tooltip'"
            [tooltipTitle]="getTooltipText(series.label, series.value.toLocaleString())"
          />
          <svg:text
            class="label percent-label"
            dy="-0.5em"
            x="0"
            y="5"
            count-up 
            [countTo]="series.percent"
            [countSuffix]="'%'"
            text-anchor="middle">
          </svg:text>
          <svg:text
            class="label"
            dy="0.5em"
            x="0"
            y="5"
            text-anchor="middle">
            {{series.label}}
          </svg:text>
          <svg:text
            class="label"
            dy="1.23em"
            x="0"
            [attr.y]="series.outerRadius"
            text-anchor="middle"
            count-up 
            [countTo]="series.total"
            [countPrefix]="'Total: '">
          </svg:text>
        </svg:g>
      </svg:g>
    </chart>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieGridComponent extends BaseChartComponent implements OnChanges, OnDestroy, AfterViewInit {
  
  @Input() view;
  @Input() results;
  @Input() scheme;
  @Input() customColors;

  @Output() select = new EventEmitter();
  @Output() legendLabelClick: EventEmitter<any> = new EventEmitter();

  dims: ViewDimensions;
  data: any[];
  transform: string;
  series: any[];
  domain: any[];
  colorScale: Function;
  margin = [20, 20, 20, 20];

  constructor(private element: ElementRef, private cd: ChangeDetectorRef, zone: NgZone) {
    super(element, zone, cd);
  }

  ngAfterViewInit(): void {
    this.bindResizeEvents(this.view);
  }

  ngOnDestroy(): void {
    this.unbindEvents();
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.update();
  }

  update(): void {
    super.update();

    this.zone.run(() => {
      this.dims = calculateViewDimensions({
        width: this.width,
        height: this.height,
        margins: this.margin
      });

      this.domain = this.getDomain();

      this.data = gridLayout(this.dims, this.results, 150);
      this.transform = `translate(${this.margin[3]} , ${this.margin[0]})`;

      this.series = this.getSeries();
      this.setColors();
    });
  }

  getTooltipText(label, val): string {
    return `
      <span class="tooltip-label">${label}</span>
      <span class="tooltip-val">${val}</span>
    `;
  }

  getDomain(): any[] {
    return this.results.map(d => d.name);
  }

  getSeries(): any[] {
    let total = this.getTotal();

    return this.data.map((d) => {
      const baselineLabelHeight = 20;
      const padding = 10;
      const label = formatLabel(d.data.name);
      const value = d.data.value;
      const radius = (d3.min([d.width - padding, d.height - baselineLabelHeight]) / 2) - 5;
      const innerRadius = radius * 0.9;

      let count = 0;
      const colors = () => {
        count += 1;
        if (count === 1) {
          return 'rgba(100,100,100,0.3)';
        } else {
          return this.colorScale(label);
        }
      };

      const xPos = d.x + (d.width - padding) / 2;
      const yPos = d.y + (d.height - baselineLabelHeight) / 2;

      return {
        transform: `translate(${xPos}, ${yPos})`,
        colors,
        innerRadius,
        outerRadius: radius,
        label: trimLabel(label),
        total: value,
        value,
        percent: d3.format(".1p")(d.data.percent),
        data: [d, {
          data: {
            other: true,
            value: total - value,
            name: d.data.name
          }
        }]
      };
    });
  }

  getTotal(): any {
    return this.results
      .map(d => d.value)
      .reduce((sum, d) => { return sum + d; }, 0);
  }

  onClick(data): void {
    this.select.emit(data);
  }

  setColors(): void {
    this.colorScale = colorHelper(this.scheme, 'ordinal', this.domain, this.customColors);
  }

}
