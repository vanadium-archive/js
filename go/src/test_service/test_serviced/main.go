// Copyright 2015 The Vanadium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// Command test_serviced is an implementation of the test_service service.
package main

import (
	"fmt"
	"log"

	"v.io/v23"
	"v.io/x/ref/lib/signals"
	_ "v.io/x/ref/profiles"
)

func main() {
	ctx, shutdown := v23.Init()
	defer shutdown()

	s, endpoint, err := StartServer(ctx)
	if err != nil {
		log.Fatal("", err)
	}
	defer s.Stop()

	fmt.Printf("Listening at: %v\n", endpoint)
	<-signals.ShutdownOnSignals(ctx)
}
