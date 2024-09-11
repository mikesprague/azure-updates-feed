export type PostsObject = {
    date: string;
    link: string;
    title: string;
    category: string;
    description: string;
};
export type ResultsObject = {
    lastUpdated: string | undefined;
    posts: PostsObject[];
};
export interface Config {
    url: string;
    selectors: {
        updateRow: string;
        date: string;
        link: string;
        linkAlt: string;
        title: string;
        category: string;
        description: string;
    };
    userAgent?: string;
    jsonFileName: string;
    jsonOutputDir: string;
    rssFileName: string;
    rssOutputDir: string;
}
//# sourceMappingURL=index.d.ts.map