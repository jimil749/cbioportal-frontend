import * as React from 'react';
import * as _ from "lodash";
import LazyMobXTable, { Column } from "../../../shared/components/lazyMobXTable/LazyMobXTable";
import { observer } from "mobx-react";
import {computed, observable} from "mobx";
import { Badge, Checkbox } from 'react-bootstrap';
import {calculateExpressionTendency, formatAlterationTendency, STAT_IN_headerRender} from "./EnrichmentsUtil";
import { formatLogOddsRatio, formatSignificanceValueWithStyle } from "shared/lib/FormatUtils";
import { toConditionalPrecision, } from 'shared/lib/NumberUtils';
import styles from "./styles.module.scss";
import { ExpressionEnrichmentRow } from 'shared/model/ExpressionEnrichmentRow';
import { cytobandFilter } from 'pages/resultsView/ResultsViewTableUtils';
import autobind from 'autobind-decorator';
import { EnrichmentsTableDataStore } from 'pages/resultsView/enrichments/EnrichmentsTableDataStore';
import classNames from "classnames";
import {getTextColor} from "../../groupComparison/OverlapUtils";

export interface IExpressionEnrichmentTableProps {
    columns?: ExpressionEnrichmentTableColumnType[];
    data: ExpressionEnrichmentRow[];
    initialSortColumn?: string;
    dataStore: EnrichmentsTableDataStore;
    onCheckGene?: (hugoGeneSymbol: string) => void;
    onGeneNameClick?: (hugoGeneSymbol: string, entrezGeneId: number) => void;
    checkedGenes?:string[];
    group1Name:string;
    group2Name:string;
    group1Description:string;
    group2Description:string;
    group1Color?:string;
    group2Color?:string;
    mutexTendency?:boolean;
}

export enum ExpressionEnrichmentTableColumnType {
    GENE,
    CYTOBAND,
    MEAN_IN_GROUP1,
    MEAN_IN_GROUP2,
    STANDARD_DEVIATION_IN_GROUP1,
    STANDARD_DEVIATION_IN_GROUP2,
    LOG_RATIO,
    P_VALUE,
    Q_VALUE,
    TENDENCY
}

type ExpressionEnrichmentTableColumn = Column<ExpressionEnrichmentRow> & { order?: number, shouldExclude?: () => boolean };

export class ExpressionEnrichmentTableComponent extends LazyMobXTable<ExpressionEnrichmentRow> {
}

@observer
export default class ExpressionEnrichmentTable extends React.Component<IExpressionEnrichmentTableProps, {}> {

    public static defaultProps = {
        columns: [
            ExpressionEnrichmentTableColumnType.GENE,
            ExpressionEnrichmentTableColumnType.CYTOBAND,
            ExpressionEnrichmentTableColumnType.MEAN_IN_GROUP1,
            ExpressionEnrichmentTableColumnType.MEAN_IN_GROUP2,
            ExpressionEnrichmentTableColumnType.STANDARD_DEVIATION_IN_GROUP1,
            ExpressionEnrichmentTableColumnType.STANDARD_DEVIATION_IN_GROUP2,
            ExpressionEnrichmentTableColumnType.LOG_RATIO,
            ExpressionEnrichmentTableColumnType.P_VALUE,
            ExpressionEnrichmentTableColumnType.Q_VALUE,
            ExpressionEnrichmentTableColumnType.TENDENCY
        ],
        initialSortColumn: "q-Value",
        mutexTendency: true
    };

    private checkboxChange(hugoGeneSymbol: string) {
        const row: ExpressionEnrichmentRow = _.find(this.props.data, {hugoGeneSymbol})!;
        row.checked = !row.checked;
        this.props.onCheckGene!(hugoGeneSymbol);
    }

    @autobind
    private onRowClick(d: ExpressionEnrichmentRow) {
        this.props.onGeneNameClick!(d.hugoGeneSymbol, d.entrezGeneId);
        this.props.dataStore.setHighlighted(d);
    }

    @computed get columns(): { [columnEnum: number]: ExpressionEnrichmentTableColumn } {
        const columns: { [columnEnum: number]: ExpressionEnrichmentTableColumn } = {};

        columns[ExpressionEnrichmentTableColumnType.GENE] = {
            name: "Gene",
            render: (d: ExpressionEnrichmentRow) => <div style={{ display: 'flex' }}>
                {this.props.onCheckGene && this.props.checkedGenes && (
                    <Checkbox checked={this.props.checkedGenes.includes(d.hugoGeneSymbol)}
                              disabled={d.disabled}
                              key={d.hugoGeneSymbol}
                              className={styles.Checkbox}
                              onChange={() => {
                                  this.checkboxChange(d.hugoGeneSymbol);
                              }}
                              onClick={(e)=>{
                                  e.stopPropagation();
                              }}
                              title={d.disabled ? "This is one of the query genes" : ""}
                    />
                )}
                <span className={styles.GeneName}>
                <b>{d.hugoGeneSymbol}</b></span></div>,
            tooltip: <span>Gene</span>,
            filter: (d: ExpressionEnrichmentRow, filterString: string, filterStringUpper: string) =>
                d.hugoGeneSymbol.toUpperCase().includes(filterStringUpper),
            sortBy: (d: ExpressionEnrichmentRow) => d.hugoGeneSymbol,
            download: (d: ExpressionEnrichmentRow) => d.hugoGeneSymbol
        };

        columns[ExpressionEnrichmentTableColumnType.CYTOBAND] = {
            name: "Cytoband",
            render: (d: ExpressionEnrichmentRow) => <span>{d.cytoband}</span>,
            tooltip: <span>Cytoband</span>,
            filter: cytobandFilter,
            sortBy: (d: ExpressionEnrichmentRow) => d.cytoband,
            download: (d: ExpressionEnrichmentRow) => d.cytoband
        };

        columns[ExpressionEnrichmentTableColumnType.MEAN_IN_GROUP1] = {
            name: this.props.group1Name,
            headerRender:(name:string)=>STAT_IN_headerRender("μ", name),
            render: (d: ExpressionEnrichmentRow) => <span>{d.meanExpressionInAlteredGroup.toFixed(2)}</span>,
            tooltip: <span>Mean log2 expression of the listed gene in {this.props.group1Description}</span>,
            sortBy: (d: ExpressionEnrichmentRow) => d.meanExpressionInAlteredGroup,
            download: (d: ExpressionEnrichmentRow) => d.meanExpressionInAlteredGroup.toFixed(2)
        };

        columns[ExpressionEnrichmentTableColumnType.MEAN_IN_GROUP2] = {
            name: this.props.group2Name,
            headerRender:(name:string)=>STAT_IN_headerRender("μ", name),
            render: (d: ExpressionEnrichmentRow) => <span>{d.meanExpressionInUnalteredGroup.toFixed(2)}</span>,
            tooltip: <span>Mean log2 expression of the listed gene in {this.props.group2Description}</span>,
            sortBy: (d: ExpressionEnrichmentRow) => d.meanExpressionInUnalteredGroup,
            download: (d: ExpressionEnrichmentRow) => d.meanExpressionInUnalteredGroup.toFixed(2)
        };

        columns[ExpressionEnrichmentTableColumnType.STANDARD_DEVIATION_IN_GROUP1] = {
            name: this.props.group1Name,
            headerRender:(name:string)=>STAT_IN_headerRender("σ", name),
            render: (d: ExpressionEnrichmentRow) => <span>{d.standardDeviationInAlteredGroup.toFixed(2)}</span>,
            tooltip: <span>Standard deviation of log2 expression of the listed gene in {this.props.group1Description}</span>,
            sortBy: (d: ExpressionEnrichmentRow) => d.standardDeviationInAlteredGroup,
            download: (d: ExpressionEnrichmentRow) => d.standardDeviationInAlteredGroup.toFixed(2)
        };

        columns[ExpressionEnrichmentTableColumnType.STANDARD_DEVIATION_IN_GROUP2] = {
            name: this.props.group2Name,
            headerRender:(name:string)=>STAT_IN_headerRender("σ", name),
            render: (d: ExpressionEnrichmentRow) => <span>{d.standardDeviationInUnalteredGroup.toFixed(2)}</span>,
            tooltip: <span>Standard deviation of log2 expression of the listed gene in {this.props.group2Description}</span>,
            sortBy: (d: ExpressionEnrichmentRow) => d.standardDeviationInUnalteredGroup,
            download: (d: ExpressionEnrichmentRow) => d.standardDeviationInUnalteredGroup.toFixed(2)
        };

        columns[ExpressionEnrichmentTableColumnType.LOG_RATIO] = {
            name: "Log Ratio",
            render: (d: ExpressionEnrichmentRow) => <span>{formatLogOddsRatio(d.logRatio)}</span>,
            tooltip: <span>Log2 of ratio of (unlogged) mean in {this.props.group1Name} to (unlogged) mean in {this.props.group2Name}</span>,
            sortBy: (d: ExpressionEnrichmentRow) => Number(d.logRatio),
            download: (d: ExpressionEnrichmentRow) => formatLogOddsRatio(d.logRatio)
        };

        columns[ExpressionEnrichmentTableColumnType.P_VALUE] = {
            name: "p-Value",
            render: (d: ExpressionEnrichmentRow) => <span style={{whiteSpace: 'nowrap'}}>{toConditionalPrecision(d.pValue, 3, 0.01)}</span>,
            tooltip: <span>Derived from Student's t-test</span>,
            sortBy: (d: ExpressionEnrichmentRow) => d.pValue,
            download: (d: ExpressionEnrichmentRow) => toConditionalPrecision(d.pValue, 3, 0.01)
        };

        columns[ExpressionEnrichmentTableColumnType.Q_VALUE] = {
            name: "q-Value",
            render: (d: ExpressionEnrichmentRow) => <span style={{whiteSpace: 'nowrap'}}>{formatSignificanceValueWithStyle(d.qValue)}</span>,
            tooltip: <span>Derived from Benjamini-Hochberg procedure</span>,
            sortBy: (d: ExpressionEnrichmentRow) => d.qValue,
            download: (d: ExpressionEnrichmentRow) => toConditionalPrecision(d.qValue, 3, 0.01)
        };

        columns[ExpressionEnrichmentTableColumnType.TENDENCY] = {
            name: this.props.mutexTendency ? "Tendency" : "Enriched in",
            render: (d: ExpressionEnrichmentRow) => {
                let groupColor = undefined;
                const significant = d.qValue < 0.05;
                const group1Enriched = Number(d.logRatio) > 0;
                if (!this.props.mutexTendency && significant) {
                    groupColor = group1Enriched ? this.props.group1Color : this.props.group2Color;
                }
                return (
                    <div
                        className={classNames(styles.Tendency, { [styles.Significant]: significant, [styles.ColoredBackground]:!!groupColor })}
                        style={{
                            backgroundColor: groupColor,
                            color:groupColor && getTextColor(groupColor)
                        }}
                    >
                        {this.props.mutexTendency ?
                            calculateExpressionTendency(Number(d.logRatio)) :
                            formatAlterationTendency(group1Enriched ? this.props.group1Name : this.props.group2Name)
                        }
                    </div>
                );
            },
            tooltip: 
                <table>
                    <tr>
                        <td>Log ratio > 0</td>
                        <td>: Higher expression in {this.props.group1Name}</td>
                    </tr>
                    <tr>
                        <td>Log ratio &lt;= 0</td>
                        <td>: Higher expression in {this.props.group2Name}</td>
                    </tr>
                    <tr>
                        <td>q-Value &lt; 0.05</td>
                        <td>: Significant association</td>
                    </tr>
                </table>,
            filter: (d: ExpressionEnrichmentRow, filterString: string, filterStringUpper: string) =>
                calculateExpressionTendency(Number(d.logRatio)).toUpperCase().includes(filterStringUpper),
            sortBy: (d: ExpressionEnrichmentRow) => calculateExpressionTendency(Number(d.logRatio)),
            download: (d: ExpressionEnrichmentRow) => calculateExpressionTendency(Number(d.logRatio))
        };

        return columns;
    }

    public render() {
        const orderedColumns = _.sortBy(this.columns, (c: ExpressionEnrichmentTableColumn) => c.order);
        return (
            <ExpressionEnrichmentTableComponent initialItemsPerPage={20} paginationProps={{ itemsPerPageOptions: [20] }}
                columns={orderedColumns} data={this.props.data} initialSortColumn={this.props.initialSortColumn}
                onRowClick={this.props.onGeneNameClick ? this.onRowClick : undefined} dataStore={this.props.dataStore}/>
        );
    }
}
