// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package main

import (
	"runtime"

	"v.io/v23"
	"v.io/x/ref/lib/signals"
	_ "v.io/x/ref/runtime/factories/generic"
)

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())
	ctx, shutdown := v23.Init()
	defer shutdown()

	s := startServer(ctx, v23.GetListenSpec(ctx))
	defer s.Stop()

	<-signals.ShutdownOnSignals(ctx)
}
