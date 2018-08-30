/*

	** Copyright John Harding 2018
	** This file contains CommentDisplay and CommentGroup
	** CommentGroup is a child of CommentDisplay, and contains a group of one top level comment, and all of its replies

*/

import React, { PropTypes } from 'react';
import { Link, withRouter } from 'react-router';
import { connect } from 'react-redux';
import CommentEdit from './CommentEdit';
import {filterErrorList, searchGeneralUI} from 'util/helpers/filterStoreData';
import sharedCommentValidation from 'util/helpers/sharedCommentValidation';
import * as sharedUserValidation from 'util/helpers/sharedUserValidation';
import * as pageHelpers from 'util/helpers/pageHelpers';

import * as PostActions from 'modules/Post/PostActions';
import * as UIActions from 'modules/UI/UIActions';

import styles from './Comment.scss';
import stylesPost from '../styles/PostStyles.scss';

class CommentGroup extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
	    	replyRandomId: Math.round(Math.random() * 1000000), // used for tracking errors for comments (when replying); unique to each page load
	    	editRandomId: Math.round(Math.random() * 1000000), // used for tracking errors for comments (when editing); unique to each page load
		}

		// info on each of the following can be found where the function is defined
		this.cancelComment = this.cancelComment.bind(this);
		this.cancelReply = this.cancelReply.bind(this);
		this.customFocusFunction = this.customFocusFunction.bind(this);
		this.isUserLoggedIn = this.isUserLoggedIn.bind(this);
		this.onDeleteComment = this.onDeleteComment.bind(this);
		this.onReportComment = this.onReportComment.bind(this);
		this.onSubmitComment = this.onSubmitComment.bind(this);
		this.onSubmitCommentEdit = this.onSubmitCommentEdit.bind(this);
		this.onSubmitCommentVote = this.onSubmitCommentVote.bind(this);
		this.openReply = this.openReply.bind(this);
		this.toggleCommentUnique = this.toggleCommentUnique.bind(this);
		this.toggleEditThisComment = this.toggleEditThisComment.bind(this);

		this.textAreaContentElem = null;
	}

	// cancel editing a comment
	cancelComment() {
		this.toggleEditThisComment(false);
	}

	// cancel a reply
	cancelReply() {
		this.textAreaContentElem = null;

		this.toggleCommentUnique(this.state.replyRandomId);
		this.props.updateHasCommentChanged(false); // tracks how many comments are being replied to/changed
	}

	// when replying to a comment, hold a reference to that new comment so we may focus it when necessary
	customFocusFunction(contentElem) {
		this.textAreaContentElem = contentElem;
	}

	// trigger an error when submitting if user is not logged in; NOTE: no longer showing error; this now will open login modal
	isUserLoggedIn(type) {
		if (this.props.user.id === -1) {
			this.props.notLoggedIn(type);
			return false;
		}

		return true;
	}

	// delete comment when confirmed
	onDeleteComment() {
		if (confirm('Are you sure you want to delete this comment?')) {
			this.props.deleteComment(this.props.topComment.commentId, this.props.topComment);
		}
	}

	// report comment when confirmed
	onReportComment() {
		if (confirm('Are you sure you want to report this comment?')) {
			this.props.reportComment(this.props.topComment.commentId);
		}
	}

	// submit comment (will always be a reply in this Class)
	onSubmitComment(content, uniqueEditId) {
		if (!this.isUserLoggedIn('reply')) { // if user isn't logged in, return
			return;
		}

		const propsReplyTop = this.props.topComment.replyTop;

		// if not replying to top comment but top comment id is not -1 (which means that it has a top comment), use that same top comment id
		// if replying to a top comment (a level 0 comment), use the id of the comment user is replying to
		const replyTop = propsReplyTop !== -1 && propsReplyTop !== null ? propsReplyTop : this.props.topComment.commentId;

		this.props.submitComment(content, replyTop, this.props.topComment.commentId, 1, uniqueEditId); // level will always be 1 for replies
	}

	// submit comment edit if logged in
	onSubmitCommentEdit(content, uniqueEditId) {
		if (!this.isUserLoggedIn('submit')) {
			return;
		}

		this.props.submitCommentEdit(this.props.topComment.commentId, content, uniqueEditId);
	}

	// save comment vote if logged in
	onSubmitCommentVote(submittedVote, commentId) {
		if (!this.isUserLoggedIn('vote')) {
			return;
		}

		let newVote = 0;

		if (this.props.topComment.thisUserVote !== submittedVote) {
			newVote = submittedVote;
		}

		this.props.submitCommentVote(newVote, commentId);
	}

	// open a new reply
	openReply(isReplying) {
		if (isReplying === true) { // if already replying and we have reference to textarea, focus the textarea
			if (this.textAreaContentElem !== null) {
				this.textAreaContentElem.focus();
			}
		} else { // open new reply
			this.toggleCommentUnique(this.state.replyRandomId);
			this.props.updateHasCommentChanged(true); // tracks how many comments are being replied to/changed (to confirm() on page leave)
		}
	}

	// toggle editing a comment; should rename
	toggleCommentUnique(uniqueEditId) {
		this.props.toggleCommentUnique(uniqueEditId, this.props.generalUI);
	}

	// called on "Edit" click
	toggleEditThisComment(isStartingEdit = true) {
		this.toggleCommentUnique(this.state.editRandomId);
		this.props.updateHasCommentChanged(isStartingEdit);
	}

	render() {
		const props = this.props;
		const thisLevel = props.topComment.level === 0 ? 0 : 1;

		// replies must all be in their own group since each instance of CommentGroup shows one comment
		const replies = props.replies.map((reply, index) => {
			return <CommentGroup
						key={index}
						postSlug={props.postSlug}
						topComment={reply}
						user={props.user}
						replies={[]}
						updateHasCommentChanged={props.updateHasCommentChanged}
						loadMoreComments={props.loadMoreComments}
						notLoggedIn={props.notLoggedIn}
						reportComment={props.reportComment}
						deleteComment={props.deleteComment}
						submitComment={props.submitComment}
						submitCommentEdit={props.submitCommentEdit}
						submitCommentVote={props.submitCommentVote}
						generalUI={props.generalUI}
						toggleCommentUnique={props.toggleCommentUnique} />;
		});

		// how many replies can we attribute to loading from server (not submitted in this page session by this user)
		const initRepliesLength = props.replies.filter(reply => reply.justSubmitted !== true).length;

		// determine class for loadMoreButton (if loading show loading icon)
        const loadMoreClass = !searchGeneralUI(this.props.generalUI, `MoreCommentsLoading_${props.topComment.commentId}`, 'loading', true)
        	? styles['comment-display__load-more']
        	: `${styles['comment-display__load-more']} ${styles['comment-display__load-more--loading']}`;

		const loadMoreButton = thisLevel === 0 && props.replies.length < props.topComment.numChildren
			?	<button 
					onClick={() => {props.loadMoreComments(1, props.topComment.commentId, initRepliesLength);}}
					className={loadMoreClass}>
					<span>
						Load more replies<i className='fa fa-angle-down'></i>
					</span>
					<span className={styles['loading-icon']}></span>
				</button>
			: '';

        const userId = props.user.id;

	    let scoreClass = styles['comment-display__individual__score']; // used for coloring the comment's score (green if positive; red negative)
	    let userChangedVote = 0;
	    const propsThisUserVote = props.topComment.thisUserVote || 0;

	    // calculate change in comment's vote total based on what it was when the page loaded
	   	if (propsThisUserVote !== props.topComment.initialUserVote) {
	   		if (Math.abs(props.topComment.initialUserVote) === 1) {
	   			if (propsThisUserVote !== 0) {
	   				userChangedVote = propsThisUserVote * 2;
	   			} else {
	   				userChangedVote = -props.topComment.initialUserVote;
	   			}
	   		} else {
	   			userChangedVote = propsThisUserVote;
	   		}
	   	}

	   	// the calculated score of the comment (including what this user voted)
	    const scoreCalc = props.topComment.upVotes - props.topComment.downVotes + userChangedVote;

	    let thisContent = pageHelpers.formatComment(props.topComment.content);

	    // update score class
	    if (scoreCalc > 0) {
	    	scoreClass = [scoreClass, styles['comment-display__individual__score--positive']].join(' ');
	    } else
	    if (scoreCalc < 0) {
	    	scoreClass = [scoreClass, styles['comment-display__individual__score--negative']].join(' ');
	    }

	    const thumbsUpClassDefault = styles['comment-display__individual__thumb-btn'];
	    const thumbsDownClassDefault = [styles['comment-display__individual__thumb-btn'], styles['comment-display__individual__thumb-btn--down']].join(' ');

	    const thumbsUpClass = props.topComment.thisUserVote > 0 ? `${thumbsUpClassDefault} ${styles['comment-display__individual__thumb-btn--green']}` : thumbsUpClassDefault;
	    const thumbsDownClass = props.topComment.thisUserVote < 0 ? `${thumbsDownClassDefault} ${styles['comment-display__individual__thumb-btn--red']}` : thumbsDownClassDefault;

	    const defaultCommentWrapClass = styles['comment-display__individual'];
	    let commentWrapperClass = props.topComment.isHighlighted ? [defaultCommentWrapClass, styles['comment-display__individual--highlighted']].join(' ') : defaultCommentWrapClass;

	    // are we editing or replying right now in regards to this comment?
	    const isEditing = searchGeneralUI(props.generalUI, `CommentUniqueEdit_${this.state.editRandomId}`, 'editing', true);
	    const isReplying = searchGeneralUI(props.generalUI, `CommentUniqueEdit_${this.state.replyRandomId}`, 'editing', true);

	    let usernameWrapper = <Link className={styles['comment-display__link']} to={`/user/${props.topComment.creatorUsername}`}>
			@{props.topComment.creatorUsername}
		</Link>;

		// hide deleted comments
		if (props.topComment.isDeleted === 1) {
			commentWrapperClass = `${commentWrapperClass} ${styles['comment-display__individual--deleted']}`;
			usernameWrapper = <span>Comment Deleted</span>;
		}

		return (
			<div className={styles[`comment-display__level-${thisLevel}`]}>
				{ !isEditing && 
					<div className={commentWrapperClass}>
						<div>
							{usernameWrapper}
							{props.topComment.isDeleted !== 1 &&
		                        <span className={styles['comment-display__date']} title={props.topComment.createdConverted.toString()}>{ pageHelpers.calculateTimeText(props.topComment.createdConverted) }</span>
							}
						</div>
						{props.topComment.isDeleted !== 1 &&
							<div
								dangerouslySetInnerHTML={ { __html: thisContent } }>
							</div>
						}
						{props.topComment.isDeleted !== 1 &&
							<div>
								<span className={scoreClass}>{scoreCalc}</span>
								<button
									onClick={(e) => {this.onSubmitCommentVote(1, props.topComment.commentId);}}
									className={thumbsUpClass}>
									<i className='fa fa-thumbs-up'></i>
								</button>
								<button
									onClick={(e) => {this.onSubmitCommentVote(-1, props.topComment.commentId);}}
									className={thumbsDownClass}>
									<i className='fa fa-thumbs-down'></i>
								</button>
		                        <button
		                        	onClick={() => {this.openReply(isReplying);}}
		                        	className={[styles['comment-display__individual__reply-actions'], styles['comment-display__individual__reply-actions--first']].join(' ')}>
		                        	Reply
		                        </button>
		                        {userId === props.topComment.creator &&
		                        	<button className={styles['comment-display__individual__reply-actions']} onClick={this.toggleEditThisComment}>Edit</button>
		                        }
		                        {userId === props.topComment.creator &&
		                        	<button className={styles['comment-display__individual__reply-actions']} onClick={this.onDeleteComment}>Delete</button>
		                        }
		                        <Link className={styles['comment-display__individual__reply-actions']} to={`/post/${props.postSlug}?comment=${props.topComment.commentId}#fg-comments-section`} onClick={(e) => {e.preventDefault();}}>Permalink</Link>
		                        <button
		                        	onClick={this.onReportComment}
		                        	className={[styles['comment-display__individual__reply-actions'], styles['comment-display__individual__reply-actions--report']].join(' ')}>
		                        	Report
		                        </button>
							</div>
						}
					</div>
				}
				{isEditing && 
					<CommentEdit
						id={props.topComment.commentId}
						initialCommentContent={props.topComment.content}
						updateHasCommentChanged={props.updateHasCommentChanged}
						customClassWrapper={'comment-display-edit'}
						isEditing={true}
						uniqueEditId={this.state.editRandomId}
						submitComment={(content, uniqueEditId) => {this.onSubmitCommentEdit(content, uniqueEditId);}}
						cancelComment={this.cancelComment}
						shouldFocusOnLoad={true} />
				}
				{isReplying &&
					<div className={thisLevel === 0 && styles[`comment-display__level-1`]}>
						<CommentEdit
							id={-1}
							initialCommentContent={`@${props.topComment.creatorUsername} `}
							updateHasCommentChanged={props.updateHasCommentChanged}
							customClassWrapper={'comment-display-edit'}
							isEditing={true}
							uniqueEditId={this.state.replyRandomId}
							submitComment={(content, uniqueEditId) => {this.onSubmitComment(content, uniqueEditId);}}
							cancelComment={this.cancelReply}
							shouldFocusOnLoad={true}
							customFocusFunction={this.customFocusFunction} />
					</div>
				}
				{replies}
				<div className={styles[`comment-display__level-1`]}>
					{loadMoreButton}
				</div>
			</div>
		);
	}
}

CommentGroup.propTypes = {
	postSlug: PropTypes.string.isRequired,
	topComment: PropTypes.shape({}),
	replies: PropTypes.arrayOf(PropTypes.shape({})),
	user: PropTypes.shape({
		id: PropTypes.number,
	}),
	updateHasCommentChanged: PropTypes.func.isRequired,
	notLoggedIn: PropTypes.func.isRequired,
	submitComment: PropTypes.func.isRequired,
	submitCommentEdit: PropTypes.func.isRequired,
	loadMoreComments: PropTypes.func.isRequired,
	reportComment: PropTypes.func.isRequired,
	deleteComment: PropTypes.func.isRequired,
	submitCommentVote: PropTypes.func.isRequired,
}


// the wrapper for all comments
class CommentDisplay extends React.Component {
	constructor(props) {
		super(props);

		this.state = {
			countCommentsChanged: 0, // count how many comments are currently being edited/replied to
	    	editRandomId: Math.round(Math.random() * 1000000), // unique id for tracking changes to new top comment
		}

		this.isUserLoggedIn = this.isUserLoggedIn.bind(this);
		this.newCommentChanged = this.newCommentChanged.bind(this);
		this.onSubmitComment = this.onSubmitComment.bind(this);
		this.updateHasCommentChanged = this.updateHasCommentChanged.bind(this);
	}

    componentDidMount() {
        // when navigating to another page, notifiy if unsaved changes
        this.props.router.setRouteLeaveHook(this.props.route, () => {
            if (this.state.countCommentsChanged > 0) {
            	const commentPlural = this.state.countCommentsChanged === 1 ? '' : 's';
                return `You have ${this.state.countCommentsChanged} unsaved comment${commentPlural}, are you sure you want to leave this page?`;
            } else {
                this.cancelEditJustClicked = false;
            }
        });
    }

    // show error if not logged in when trying to submit, etc; NOTE: no longer showing error; this now will open login modal
	isUserLoggedIn(type) {
		if (this.props.user.id === -1) {
			this.props.notLoggedIn(type);
			return false;
		}

		return true;
	}

	// decides when editing, and when not editing; used to override the content and replace with a blank value when no longer editing
	newCommentChanged(hasChanged) {
		const thisEditingBool = searchGeneralUI(this.props.generalUI, `CommentUniqueEdit_${this.state.editRandomId}`, 'editing', true);
		if ((thisEditingBool === true && hasChanged !== true) || (thisEditingBool !== true)) {
			this.props.toggleCommentUnique(this.state.editRandomId, this.props.generalUI);
		}
	}

	onSubmitComment(content, uniqueEditId) {
		if (!this.isUserLoggedIn('submit')) {
			return;
		}
		this.props.submitComment(content, -1, -1, 0, uniqueEditId); // level will always be 0 for comments in CommentDisplay class
	}

	// tracks how many comments are being replied to/changed (to confirm() on page leave)
	updateHasCommentChanged(hasChanged) {
		if (hasChanged) {
			this.setState({
				countCommentsChanged: this.state.countCommentsChanged + 1,
			});
			return;
		}

		this.setState({
			countCommentsChanged: this.state.countCommentsChanged - 1,
		});
	}

	render() {
		const props = this.props;
		let sortByTrending = [];

		// give each comment a JS date based on MySQL date and push 
		props.commentData.forEach((comment) => {
			if (comment.level === 0) {
				const t = comment.created.split(/[- :]/);
				const d = new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));
				comment.createdConverted = d;

				sortByTrending.push(comment); // push top comments to sortByTrending
			}
		});

		// initial sorting of top comments
		sortByTrending.sort((a, b) => {
			if ((a.trending > b.trending || a.hasHighlightedComment === true || a.justSubmitted === true) && b.hasHighlightedComment !== true && b.justSubmitted !== true) {
				return -1;
			}
			return 1;
		});

        const loadMoreClass = !searchGeneralUI(this.props.generalUI, `MoreCommentsLoading_-1`, 'loading', true)
        	? styles['comment-display__load-more']
        	: `${styles['comment-display__load-more']} ${styles['comment-display__load-more--loading']}`;

		const loadMoreButton = sortByTrending.length < props.post_top_comments
			?	<button
					onClick={() => {props.loadMoreComments(0, -1, sortByTrending.length)}}
					className={loadMoreClass}>
					<span>
						Load more comments<i className='fa fa-angle-down'></i>
					</span>
					<span className={styles['loading-icon']}></span>
				</button>
			: '';

		// find all replies that have just been added by current user to a specific comment
		const findAllSubmittedIndex = (replies, replyCommentId) => {
			let indexList = [];
			const replyLength = replies.length;

			for (let i = 0; i < replyLength; i++) {
				if (replyCommentId === replies[i].replyTo && replies[i].justSubmitted === true) {
					indexList.push(i);
				}
			}

			return indexList;
		}

		// to recursively add all replies of replies before a comment that was just added by current user
		const recursiveFinalReplies = (replies, topCommentId) => {
			let finalReplies = [];
			const replyIndexList = findAllSubmittedIndex(replies, topCommentId);

			if (replyIndexList.length === 0) {
				return [];
			}

			replyIndexList.forEach(index => {
				finalReplies.push(replies[index]);

				finalReplies.push(...recursiveFinalReplies(replies, replies[index].commentId));
			});

			return finalReplies;
		}

		// final list of top comments in order and their list of replies in order (top comments ordered by trending; replies by date (oldest first))
		const finalTopComments = sortByTrending.map((topComment, index) => {
			let replies = [];
			let containsJustSubmitted = false;

			// put all replies to a comment into replies variable
			props.commentData.forEach((thisComment) => {
				if (topComment.commentId === thisComment.replyTop) {
					const t = thisComment.created.split(/[- :]/);
					const d = new Date(Date.UTC(t[0], t[1]-1, t[2], t[3], t[4], t[5]));
					thisComment.createdConverted = d;

					// comment was just added by current user
					if (thisComment.justSubmitted === true) {
						if (typeof containsJustSubmitted === 'boolean') {
							containsJustSubmitted = [];
						}

						containsJustSubmitted.push(thisComment.replyTo);
					}

					replies.push(thisComment);
				}
			});

			// sort replies by date created (oldest first)
			replies.sort((a, b) => {
				if ((a.createdConverted < b.createdConverted || a.isHighlighted === true) && b.isHighlighted !== true) {
					return -1;
				}
				return  1;
			});

			let finalReplies = replies;

			// if there is a comment that was just submitted by current user; this will appear in a relevant position (after where the reply is to))
			if (containsJustSubmitted !== false) {
				finalReplies = [];
				finalReplies.push(...recursiveFinalReplies(replies, topComment.commentId));

				replies.forEach((reply) => {
					// if we have not already added reply to list, add reply and recursively add all replies to this reply, and replies to those replies
					if (finalReplies.findIndex(finalReply => finalReply.commentId === reply.commentId) === -1) {
						finalReplies.push(reply);
						finalReplies.push(...recursiveFinalReplies(replies, reply.commentId));
					}
				})
			}

			return <CommentGroup
						key={index}
						postSlug={props.postSlug}
						topComment={topComment}
						user={props.user}
						replies={finalReplies}
						updateHasCommentChanged={this.updateHasCommentChanged}
						loadMoreComments={props.loadMoreComments}
						notLoggedIn={props.notLoggedIn}
						reportComment={props.reportComment}
						deleteComment={props.deleteComment}
						submitComment={props.submitComment}
						submitCommentEdit={props.submitCommentEdit}
						submitCommentVote={props.submitCommentVote}
						generalUI={props.generalUI}
						toggleCommentUnique={props.toggleCommentUnique} />;
		});

	    const isEditing = searchGeneralUI(props.generalUI, `CommentUniqueEdit_${this.state.editRandomId}`, 'editing', true);
	    const overrideContent = isEditing ? {} : {overrideContent: ''};

		return (
			<div>
				<h2 id='fg-comments-section' className={[stylesPost['contributor-header'], stylesPost['contributor-header--comment']].join(' ')}>Comments</h2>
				<CommentEdit
					id={-1}
					updateHasCommentChanged={(hasChanged) => {this.updateHasCommentChanged(hasChanged);this.newCommentChanged(hasChanged);}}
					isEditing={false}
					uniqueEditId={this.state.editRandomId}
					submitComment={(content, uniqueEditId) => {this.onSubmitComment(content, uniqueEditId);}}
					{...overrideContent} />
				<div className={styles['comment-display__wrapper']}>
					{ finalTopComments.length > 0 && finalTopComments }
				</div>
				{loadMoreButton}
			</div>
		);
	}
}

CommentDisplay.propTypes = {
	postSlug: PropTypes.string.isRequired,
	post_top_comments: PropTypes.number.isRequired,
	post_total_comments: PropTypes.number.isRequired,
	shared_post_id: PropTypes.number.isRequired,
	additionalTopCommentsExist: PropTypes.bool,
    commentData: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.number,
            creator: PropTypes.number,
            creatorUsername: PropTypes.string,
            content: PropTypes.string,
            created: PropTypes.string,
            modified: PropTypes.string,
            trending: PropTypes.number,
            upVotes: PropTypes.number,
            downVotes: PropTypes.number,
            replyTop: PropTypes.number,
            replyTo: PropTypes.number,
            numReplies: PropTypes.number,
            numChildren: PropTypes.number,
            level: PropTypes.number,
            thisUserVote: PropTypes.number, // -1 = downvote; 0 = no vote; 1 = upvote
            isHighlighted: PropTypes.bool,
        })
    ).isRequired,
    route: PropTypes.shape({}).isRequired,
}

const mapDispatchToProps = (dispatch, ownProps) => {
	return {
		// handle submitting a comment or voting when not logged in
		notLoggedIn(notificationType) {
			// const notificationMap = {
			// 	'vote': 'Log in or sign up to vote.',
			// 	'reply': 'Log in or sign up to comment.',
			// 	'submit': 'Log in or sign up to comment.',
			// };
            dispatch(UIActions.openModal({name: 'logIn'}));
            // dispatch(UIActions.showGlobalBar('error', notificationMap[notificationType], 3500));
		},

		// submit vote
		submitCommentVote(newVote, commentId) {
            dispatch(PostActions.submitCommentVote(newVote, commentId, ownProps.shared_post_id));
		},

		// submit comment after checking for errors
		submitComment(content, replyTop = -1, replyTo = -1, level = 0, uniqueEditId) {
			const errorFlag = sharedCommentValidation(content, replyTop, replyTo, level, true, uniqueEditId, UIActions, dispatch);

			if (!errorFlag) {
            	dispatch(PostActions.submitComment(content, replyTop, replyTo, level, uniqueEditId, ownProps.shared_post_id));
			}
		},

		submitCommentEdit(comment_id, content, uniqueEditId) {
			const errorFlag = sharedCommentValidation(content, -1, -1, 0, true, uniqueEditId, UIActions, dispatch);

			if (!errorFlag) {
            	dispatch(PostActions.editComment(comment_id, content, uniqueEditId, ownProps.shared_post_id));
			}
		},

		// toggle showing and hiding editing of comment
		toggleCommentUnique(uniqueEditId, generalUI) {
			const thisEditingBool = searchGeneralUI(generalUI, `CommentUniqueEdit_${uniqueEditId}`, 'editing', true);

			// if we are currently showing this comment in an edit state (either editing, or a new reply)
			if (thisEditingBool === false) {
	        	dispatch(UIActions.addGeneralUI(UIActions.UI_SHOW_COMMENT, `CommentUniqueEdit_${uniqueEditId}`, 'editing', true));
			} else {
	            dispatch(UIActions.removeGeneralUI(`CommentUniqueEdit_${uniqueEditId}`));
			}
		},

		// load more comments (loads either for top comments, or comments that are the child of a top comment)
		loadMoreComments(level, top_comment_id, currently_loaded) {
			dispatch(PostActions.loadMoreComments(level, top_comment_id, currently_loaded, ownProps.shared_post_id));
		},

		deleteComment(id, commentData) {
            dispatch(PostActions.deleteComment(id, ownProps.shared_post_id, commentData));
		},

		reportComment(id) {
            dispatch(PostActions.reportComment(id, ownProps.shared_post_id));
		},
	}
}

const mapStateToProps = (state) => {
    return {
        user: state.app.user,
        generalUI: state.UI.general,
	}
}

export default withRouter(connect(mapStateToProps, mapDispatchToProps)(CommentDisplay));