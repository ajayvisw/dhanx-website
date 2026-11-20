# Will Google's TPUs kill Nvidia? No — and the reason is software

The question circulating is whether Google's TPUs and Amazon's Trainium chips end
Nvidia's dominance.

I do not think so, for two reasons that are often conflated.

## CUDA is the actual moat

Nvidia's advantage is not primarily the silicon. It is **CUDA** — a software
ecosystem and set of programming tools built over **seventeen years**, now the
standard that AI researchers worldwide work in.

A competitor does not merely need a faster chip. It needs a programming
environment, and then it needs developers to adopt it — which means rewriting
tooling, retraining engineers, and porting work that already runs.

Recreating seventeen years of ecosystem development is not impossible. Doing it
quickly is very hard, and the incumbent is not standing still.

## TPUs and GPUs are different things

This is the distinction most commentary misses.

**TPUs and Trainium are ASICs** — application-specific integrated circuits. Highly
specialised silicon optimised for particular workloads, largely to reduce the cost
of running Google's and Amazon's own clouds.

**An Nvidia GPU is a Swiss Army knife.** It handles training and inference across
workload types.

So frontier training continues on general-purpose GPUs, while in-house chips take
the specialised internal workloads that do not require that flexibility. These are
complementary rather than substitutes.

## What is actually happening

Demand still exceeds supply. The hyperscalers are doing two things simultaneously:
optimising cost by moving suitable workloads onto their own silicon, **and
continuing to buy large volumes of Nvidia chips** for everything else.

That is cost management, not replacement.

## The honest caveats

Margin compression is likely. If AMD or Broadcom field genuinely competitive
alternatives, Nvidia will cut prices to retain customers — and that affects the
economics even while the market position holds.

A credible challenger could emerge. My expectation is that the software ecosystem
sustains the advantage for a considerable period, but that is a judgement rather
than a certainty.

The distinction worth holding: **a company can lose pricing power without losing
its market.** Those are very different outcomes, and the current narrative conflates
them.
