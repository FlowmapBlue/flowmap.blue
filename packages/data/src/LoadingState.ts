import { csvParse, DSVRowString } from 'd3-dsv';
import { getSheetDataAsArray, parseGsheetsJson, SheetData } from './gsheets';

export enum LoadingStatus {
  LOADING = 'LOADING',
  ERROR = 'ERROR',
  DONE = 'DONE',
}

export type LoadingState<T> =
  | { status: LoadingStatus.LOADING; data?: T }
  | { status: LoadingStatus.ERROR; data?: T }
  | { status: LoadingStatus.DONE; data: T };

export const fetchCsv = async <Row>(
  url: string,
  transformRow?: (rawRow: DSVRowString, index: number, columns: string) => Row | undefined | null
): Promise<LoadingState<Row[]>> => {
  try {
    const response = await fetch(url);
    if (response.ok) {
      const text = await response.text();
      const data = csvParse<Row>(
        text,
        // @ts-ignore
        transformRow
      );
      return { status: LoadingStatus.DONE, data };
    } else {
      return { status: LoadingStatus.ERROR };
    }
  } catch (err) {
    console.error(err);
    return { status: LoadingStatus.ERROR };
  }
};
