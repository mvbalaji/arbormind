import React, { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Send, Zap, User, Mail, TrendingUp } from "lucide-react";

export default function AIAssistant() {
  const [activeTab, setActiveTab] = useState("insights");

  return (
    <Layout>
      <div className="flex flex-col gap-6 relative">
        {/* Background glow effect */}
        <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-accent/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.3)]">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2">
              AI Intelligence <Sparkles className="w-5 h-5 text-yellow-400" />
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">Smart suggestions, scoring, and drafting.</p>
          </div>
        </div>

        <div className="flex gap-4 border-b border-white/10 pb-px">
          {["insights", "drafts", "scoring"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-medium text-sm capitalize transition-all border-b-2 ${activeTab === tab ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-white'}`}
            >
              {tab === 'insights' ? 'Next Best Actions' : tab === 'drafts' ? 'Email Drafter' : 'Lead Scoring Explained'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {activeTab === 'insights' && (
            <>
              <Card className="glass-panel border-white/5 col-span-2">
                <CardContent className="p-6 space-y-6">
                  <h3 className="font-display font-semibold text-lg text-white mb-4">Recommended Actions</h3>
                  
                  <div className="ai-gradient-border rounded-xl p-4 bg-black/40 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-accent" />
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">Follow up with Sarah Jenkins</h4>
                        <p className="text-sm text-muted-foreground mt-1">It's been 4 days since the proposal was sent. Deal probability is high (85%).</p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" className="bg-primary text-white">Generate Email</Button>
                          <Button size="sm" variant="outline" className="border-white/10">Dismiss</Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border border-white/10 rounded-xl p-4 bg-black/20">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white">Acme Corp is expanding</h4>
                        <p className="text-sm text-muted-foreground mt-1">News signals indicate Acme Corp just raised Series B. Good time to pitch the Enterprise tier.</p>
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="outline" className="border-white/10">View Account</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-white/5">
                <CardContent className="p-6">
                  <h3 className="font-display font-semibold text-lg text-white mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-400" /> Quick Stats
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                      <div className="text-sm text-muted-foreground mb-1">AI Accuracy Score</div>
                      <div className="text-2xl font-bold text-white">94.2%</div>
                      <div className="text-xs text-chart-3 mt-1">+2.1% this week</div>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                      <div className="text-sm text-muted-foreground mb-1">Hours Saved</div>
                      <div className="text-2xl font-bold text-white">12.5h</div>
                      <div className="text-xs text-muted-foreground mt-1">Via automated drafting</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'drafts' && (
            <Card className="glass-panel border-white/5 col-span-full">
              <CardContent className="p-6 flex gap-6 min-h-[500px]">
                <div className="w-1/3 border-r border-white/10 pr-6 space-y-4">
                  <h3 className="font-display font-semibold text-white mb-4">Templates</h3>
                  {['Proposal Follow-up', 'Cold Outreach', 'Meeting Recap', 'Re-engagement'].map((t, i) => (
                    <div key={i} className={`p-3 rounded-lg border cursor-pointer transition-colors ${i === 0 ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-black/20 border-white/5 text-muted-foreground hover:bg-white/5'}`}>
                      {t}
                    </div>
                  ))}
                </div>
                <div className="flex-1 flex flex-col">
                  <div className="flex-1 bg-black/30 rounded-xl border border-white/5 p-6 font-mono text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    Subject: Checking in on our proposal - arbormind.in{'\n\n'}
                    Hi Sarah,{'\n\n'}
                    I hope this email finds you well.{'\n\n'}
                    I'm writing to follow up on the proposal I sent over on Tuesday. I wanted to see if you had any questions or needed further clarification on the Enterprise tier features we discussed.{'\n\n'}
                    Given your team's rapid growth, the automated workflows could save your reps about 15 hours a week immediately.{'\n\n'}
                    Would you have 10 minutes this Thursday for a quick chat?{'\n\n'}
                    Best regards,{'\n'}
                    Alex
                  </div>
                  <div className="mt-4 flex justify-end gap-3">
                    <Button variant="outline" className="border-white/10"><Sparkles className="w-4 h-4 mr-2" /> Rewrite</Button>
                    <Button className="bg-primary"><Send className="w-4 h-4 mr-2" /> Use Draft</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'scoring' && (
            <div className="col-span-full text-center py-20 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-xl font-medium text-white mb-2">Predictive Scoring Models</h3>
              <p className="max-w-md mx-auto">The AI analyzes firmographics, behavioral signals, and historical win-rates to assign 0-100 scores to leads. Configure custom weights in settings.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

// Just importing this for the empty state above
import { Target } from "lucide-react";
