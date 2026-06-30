#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { preprocessAssessmentData, exportHtmlReport } from '../components/html-export.js';
import { renderTemplate } from '../components/template-engine.js';
import { getChartConfig } from '../components/chart-engine.js';
import * as charts from '../components/chart.js';

// Mock Chart class for testing browser-side chart scripts in Node.js
class MockChart {
    constructor(ctx, config) {
        this.ctx = ctx;
        this.config = config;
    }
}
globalThis.Chart = MockChart;

console.log("================================");
console.log("DigitalBuku Assessment Engine");
console.log("Running test suite...");
console.log("================================");

let passed = 0;
let failed = 0;

async function test(name, fn) {
    try {
        await fn();
        console.log(`✓ ${name}`);
        passed++;
    } catch (err) {
        console.error(`✗ ${name}`);
        console.error(err.stack || err.message);
        failed++;
    }
}

async function runAllTests() {
    // ------------------------------------------------
    // Basic tests
    // ------------------------------------------------

    await test("Environment is working", () => {
        if (typeof process === "undefined") {
            throw new Error("Node environment unavailable");
        }
    });

    await test("Math sanity check", () => {
        if (2 + 2 !== 4) {
            throw new Error("Math failure");
        }
    });

    // ------------------------------------------------
    // HTML Export Engine & Preprocessing Tests
    // ------------------------------------------------

    const sampleData = {
        assessmentId: "ASM-TEST",
        title: "Test Assessment",
        assessmentName: "Test Assessment Q2 2026",
        assessmentType: "competency",
        organization: "TestOrg",
        createdAt: "2026-06-30T10:00:00Z",
        version: "1.0.0",
        participants: [
            {
                participantId: "P-001",
                name: "Test User",
                email: "test@user.com",
                organization: "TestOrg",
                position: "Manager"
            }
        ],
        competencies: [
            {
                competencyId: "C-001",
                name: "Competency 1",
                description: "Test Desc",
                category: "leadership",
                weight: 0.5,
                indicators: ["Indicator 1"]
            }
        ],
        scores: {
            "P-001": {
                "C-001": 90
            }
        }
    };

    await test("Preprocess assessment data maps scores correctly", () => {
        const preprocessed = preprocessAssessmentData(sampleData);
        
        if (preprocessed.assessmentId !== "ASM-TEST") {
            throw new Error("assessmentId not preserved");
        }
        if (preprocessed.participants[0].competencyScores[0].score !== 90) {
            throw new Error("Score mapping failed");
        }
        if (preprocessed.participants[0].competencyScores[0].status !== "Excellent") {
            throw new Error("Status classification failed");
        }
    });

    await test("Template engine compiles and renders templates", () => {
        const preprocessed = preprocessAssessmentData(sampleData);
        const innerHtml = renderTemplate('report', preprocessed);
        const finalHtml = renderTemplate('layout', { ...preprocessed, content: innerHtml });

        if (!finalHtml.includes("Test Assessment Q2 2026")) {
            throw new Error("Title not found in rendered HTML");
        }
        if (!finalHtml.includes("Test User")) {
            throw new Error("Participant name not found in rendered HTML");
        }
        if (!finalHtml.includes("Competency 1")) {
            throw new Error("Competency name not found in rendered HTML");
        }
    });

    await test("HTML Export writes file successfully", async () => {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const tempOutputPath = path.join(__dirname, 'temp_report.html');

        try {
            await exportHtmlReport(sampleData, tempOutputPath);
            
            if (!fs.existsSync(tempOutputPath)) {
                throw new Error("Output file was not created");
            }
            
            const fileContent = fs.readFileSync(tempOutputPath, 'utf-8');
            if (!fileContent.includes("Test Assessment Q2 2026")) {
                throw new Error("Output HTML content is incomplete");
            }
        } finally {
            if (fs.existsSync(tempOutputPath)) {
                fs.unlinkSync(tempOutputPath);
            }
        }
    });

    // ------------------------------------------------
    // Chart Engine Tests
    // ------------------------------------------------

    const labels = ["C-001", "C-002", "C-003"];
    const datasets = [{ label: "Score", data: [80, 90, 70] }];

    await test("getChartConfig supports radar, bar, line, doughnut, horizontalBar", () => {
        const types = ['radar', 'bar', 'line', 'doughnut', 'horizontalBar'];
        types.forEach(type => {
            const config = getChartConfig(type, labels, datasets);
            
            if (type === 'horizontalBar') {
                if (config.type !== 'bar') throw new Error("horizontalBar type should map to bar");
                if (config.options.indexAxis !== 'y') throw new Error("horizontalBar indexAxis option should be y");
            } else {
                if (config.type !== type) throw new Error(`${type} type mismatch`);
            }
            if (config.data.labels !== labels) throw new Error("labels mismatch");
            if (config.data.datasets !== datasets) throw new Error("datasets mismatch");
        });
    });

    await test("chart.js wrappers correctly instantiate Chart with appropriate configs", () => {
        const dummyCtx = {};
        const dummyData = { labels, datasets };
        
        // Radar
        const radar = charts.createRadarChart(dummyCtx, dummyData);
        if (radar.config.type !== 'radar') throw new Error("Radar chart config mismatch");
        
        // Bar
        const bar = charts.createBarChart(dummyCtx, dummyData);
        if (bar.config.type !== 'bar') throw new Error("Bar chart config mismatch");
        
        // Line
        const line = charts.createLineChart(dummyCtx, dummyData);
        if (line.config.type !== 'line') throw new Error("Line chart config mismatch");

        // Horizontal Bar
        const horizBar = charts.createHorizontalBarChart(dummyCtx, dummyData);
        if (horizBar.config.type !== 'bar') throw new Error("Horizontal Bar chart config type mismatch");
        if (horizBar.config.options.indexAxis !== 'y') throw new Error("Horizontal Bar indexAxis mismatch");

        // Doughnut
        const doughnut = charts.createDoughnutChart(dummyCtx, dummyData);
        if (doughnut.config.type !== 'doughnut') throw new Error("Doughnut chart config mismatch");
    });

    // ------------------------------------------------

    console.log("");
    console.log(`Passed : ${passed}`);
    console.log(`Failed : ${failed}`);

    if (failed > 0) {
        process.exit(1);
    }

    console.log("\nAll tests passed.");
    process.exit(0);
}

runAllTests();
