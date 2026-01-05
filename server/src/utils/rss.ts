import Parser from 'rss-parser';

const parser = new Parser();

export const fetchRssFeed = async (url: string) => parser.parseURL(url);
