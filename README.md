whiteboard
==========

JS library to add whiteboard functionality. Allows draw lines and text, drag them. Can synchronise content using websockets

How to use:
1. Add js, css and inage files from bin folder to you project.
2. Add html-elemment which will contain whiteboard
3. Create whiteboard with using call bay.whiteboard.Create()
4. Render created whiteboard to the html-element using whiteboard.render

To use synchronisation create websocket chat-server. Below is a sample code based on org.apache.catalina.websocket.WebSocketServlet
Link websocket address to whiteboard: whiteboard.linkWebSocket('ws://host:port/path');

Sample websocket server:

public class WhiteboardWebSocketServlet extends WebSocketServlet {
    private static final long serialVersionUID = 2L;
    // Set of connected clients
    private final Set<WBMessageInbound> connections = new CopyOnWriteArraySet<WBMessageInbound>();
    @Override
    protected StreamInbound createWebSocketInbound(String subProtocol, HttpServletRequest request) {
        return new WBMessageInbound();
    }
    private final class WBMessageInbound extends MessageInbound {
        @Override
        protected void onOpen(WsOutbound outbound) {
            connections.add(this);
        }
        @Override
        protected void onClose(int status) {
            connections.remove(this);
        }
        @Override
        protected void onBinaryMessage(ByteBuffer message) throws IOException {
            throw new UnsupportedOperationException("Binary message not supported.");
        }
        @Override
        protected void onTextMessage(CharBuffer message) throws IOException {
            // translate the message to all other clients
            for (WBMessageInbound connection : connections) {
                try {
                	if (connection != this)
                		connection.getWsOutbound().writeTextMessage(message);
                } catch (IOException ignore) {
                }
            }
        }
    }
}
