export type ModelsObject = {
    name: string;
    productId: string;
};
export type ResultsObject = {
    lastUpdated: string | undefined;
    models: ModelsObject[];
};
export interface Config {
    url: string;
    selectors: {
        modelsRows: string;
        modelName: string;
        productId: string;
    };
    outputDir: string;
    fileName: string;
}
//# sourceMappingURL=index.d.ts.map