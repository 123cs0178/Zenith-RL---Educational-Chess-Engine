import React, { useState } from 'react';
import { INTERVIEW_TOPICS } from '../data/interviewTopics';
import { InterviewTopic } from '../types';
import { BookOpen, Code, CheckCircle, HelpCircle, Lightbulb, ChevronDown, ChevronUp, Sparkles, Terminal } from 'lucide-react';

export const InterviewPrepGuide: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const categories = ['All', 'ML & Deep Learning', 'Game Theory & Search', 'Systems & Optimization', 'Engine Architecture'];

  const filteredTopics = selectedCategory === 'All'
    ? INTERVIEW_TOPICS
    : INTERVIEW_TOPICS.filter(t => t.category === selectedCategory);

  const toggleQuestion = (qKey: string) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [qKey]: !prev[qKey],
    }));
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-indigo-400" />
          <h2 className="text-xl font-extrabold text-slate-100">
            Interview Prep & Technical Logic Guide
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Complete engineering reference covering ML pipelines, Game Theory search, Zobrist hashing, policy caching, and top interview Q&A.
        </p>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedCategory === cat
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Topics List */}
      <div className="flex flex-col gap-6">
        {filteredTopics.map(topic => (
          <div
            key={topic.id}
            className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-lg"
          >
            {/* Topic Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <h3 className="text-base font-bold text-indigo-300">{topic.title}</h3>
              <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-2.5 py-1 rounded-full w-fit">
                {topic.category}
              </span>
            </div>

            {/* Summary */}
            <p className="text-xs text-slate-300 leading-relaxed">{topic.summary}</p>

            {/* Key Concepts Pills */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Core Architectural Concepts:
              </span>
              <div className="flex flex-wrap gap-2">
                {topic.keyConcepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-slate-900 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            {/* Code Snippet Highlight */}
            {topic.codeHighlightSnippet && (
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-3 flex flex-col gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Production Code Pattern</span>
                </div>
                <pre className="font-mono text-xs text-emerald-300 overflow-x-auto whitespace-pre p-2 bg-slate-950 rounded-lg">
                  {topic.codeHighlightSnippet}
                </pre>
              </div>
            )}

            {/* Interview Q&A Accordion */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <Sparkles className="w-4 h-4" />
                <span>Frequently Asked Interview Questions</span>
              </div>

              {topic.interviewQuestions.map((qa, qIdx) => {
                const qKey = `${topic.id}-q${qIdx}`;
                const isExpanded = !!expandedQuestions[qKey];

                return (
                  <div
                    key={qIdx}
                    className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden transition"
                  >
                    <button
                      onClick={() => toggleQuestion(qKey)}
                      className="w-full p-3 text-left flex items-center justify-between gap-3 text-xs font-semibold text-slate-200 hover:bg-slate-800/50 transition"
                    >
                      <div className="flex items-start gap-2">
                        <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{qa.question}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-300 flex flex-col gap-3">
                        <p className="leading-relaxed text-slate-300">{qa.answer}</p>
                        <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-lg flex items-start gap-2 text-amber-200">
                          <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-300">Interview Key Takeaway: </span>
                            {qa.keyTakeaway}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
