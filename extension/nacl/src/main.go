package main

import (
	"fmt"
	"runtime/ppapi"
)

func main() {
	ppapi.Init(newSimpleInstance)
}

type simpleInstance struct {
	ppapi.Instance
}

var _ ppapi.InstanceHandlers = simpleInstance{}

/*
func (inst simpleInstance) DidCreate(args map[string]string) bool {
	fmt.Printf("Got to DidCreate")
	fmt.Printf("Started!!")
	wsconn, err := inst.DialWebsocket("ws:echo.websocket.org")
	if err != nil {
		panic(fmt.Sprintf("Got error %v", err))
	}
	fmt.Printf("Wsconn: %v", wsconn)
	if err := wsconn.SendMessage([]byte("hello otherside")); err != nil {
		panic(fmt.Sprintf("sendmessage error %v", err))
	}
	if in, err := wsconn.ReceiveMessage(); err != nil {
		panic(fmt.Sprintf("sendmessage error %v", err))
	} else {
		fmt.Printf("Message Received: %v", string(in))
	}
	err = wsconn.Close()
	if err != nil {
		panic(fmt.Sprintf("Error closing websocket: %v", err))
	}
	return true
}*/

func HandleEcho(arg *ppapi.Var) (string, error) {
	str, err := arg.AsString()
	if err != nil {
		return "", err
	}
	fmt.Printf("Echoing: %v", str)
	return str, nil
}

func HandleReverse(arg *ppapi.Var) (string, error) {
	str, err := arg.AsString()
	if err != nil {
		return "", err
	}
	outStr := ""
	for i, _ := range str {
		outStr = outStr + string(str[len(str)-i-1])
	}
	fmt.Printf("Received: %v Responding with: %v", str, outStr)
	return outStr, nil
}

func (inst simpleInstance) DidCreate(arg map[string]string) bool {
	fmt.Printf("Got to DidCreate")
	return true
}

func (simpleInstance) DidDestroy() {
	fmt.Printf("Got to DidDestroy()")
}

func (simpleInstance) DidChangeView(view ppapi.View) {
	fmt.Printf("Got to DidChangeView(%v)", view)
}

func (simpleInstance) DidChangeFocus(has_focus bool) {
	fmt.Printf("Got to DidChangeFocus(%v)", has_focus)
}

func (simpleInstance) HandleDocumentLoad(url_loader ppapi.Resource) bool {
	fmt.Printf("Got to HandleDocumentLoad(%v)", url_loader)
	return true
}

func (simpleInstance) HandleInputEvent(event ppapi.InputEvent) bool {
	fmt.Printf("Got to HandleInputEvent(%v)", event)
	return true
}

func (simpleInstance) Graphics3DContextLost() {
	fmt.Printf("Got to Graphics3DContextLost()")
}

func (inst simpleInstance) handleRpcMessage(message ppapi.Var) {
	fmt.Printf("Handle RPC message")
}

func (inst simpleInstance) HandleMessage(message ppapi.Var) {
	fmt.Printf("Entered HandleMessage")
	type handlerType func(*ppapi.Var) (string, error)
	handlerMap := map[string]handlerType{
		"echo":    HandleEcho,
		"reverse": HandleReverse,
	}
	method, err := message.LookupStringValuedKey("method")
	if err != nil {
		panic(err.Error())
	}
	instanceID, err := message.LookupKey("instanceID")
	if err != nil {
		panic(err.Error())
	}
	h, ok := handlerMap[method]
	if !ok {
		panic(fmt.Sprintf("No handler found for method: %q", method))
	}
	arg, err := message.LookupKey("arg")
	if err != nil {
		panic(fmt.Sprintf("No arguments found for method: %q", method))
	}
	result, err := h(&arg)
	arg.Release()
	if err != nil {
		panic(fmt.Sprintf("Error calling method %q with arg %q: %v ", method, arg, err))
	}
	out := ppapi.NewDictVar()
	out.DictionarySet("instanceID", instanceID)
	out.DictionarySet("body", ppapi.VarFromString(result))
	inst.PostMessage(out)
	message.Release()
}

func (simpleInstance) MouseLockLost() {
	fmt.Printf("Got to MouseLockLost()")
}

func newSimpleInstance(inst ppapi.Instance) ppapi.InstanceHandlers {
	return simpleInstance{
		Instance: inst,
	}
}
